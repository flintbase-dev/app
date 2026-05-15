package controller

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/internal/testdb"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/service"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func setupTeamControllerTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	prevRedisEnabled := common.RedisEnabled
	prevDB := model.DB
	prevLogDB := model.LOG_DB

	common.RedisEnabled = false
	db := testdb.OpenAndReset(t)
	model.DB = db
	model.LOG_DB = db

	t.Cleanup(func() {
		common.RedisEnabled = prevRedisEnabled
		model.DB = prevDB
		model.LOG_DB = prevLogDB
	})
	return db
}

func seedTeamControllerUser(t *testing.T, db *gorm.DB, id string, email string, workOSId string) *model.User {
	t.Helper()

	user := &model.User{
		Id:       id,
		Username: id,
		Email:    email,
		WorkOSId: workOSId,
		Status:   common.UserStatusEnabled,
		Role:     common.RoleCommonUser,
		Group:    "default",
	}
	if err := db.Create(user).Error; err != nil {
		t.Fatalf("failed to seed user: %v", err)
	}
	return user
}

func mustRawJSON(t *testing.T, value any) json.RawMessage {
	t.Helper()

	payload, err := json.Marshal(value)
	if err != nil {
		t.Fatalf("failed to marshal event data: %v", err)
	}
	return payload
}

func TestHandleWorkOSOrganizationWebhookSyncsTeamState(t *testing.T) {
	db := setupTeamControllerTestDB(t)
	creator := seedTeamControllerUser(t, db, "user_team_webhook_admin", "admin@example.com", "workos_admin")
	team, err := model.CreateTeamWithCreator(model.CreateTeamParams{
		Name:                 "Old Name",
		CreatedByUserId:      creator.Id,
		WorkOSOrganizationId: "org_webhook",
		WorkOSMembershipId:   "om_webhook_admin",
	})
	if err != nil {
		t.Fatalf("CreateTeamWithCreator returned error: %v", err)
	}

	if err := handleWorkOSTeamWebhookEvent(nil, &service.WorkOSWebhookEvent{
		Type: "organization.updated",
		Data: mustRawJSON(t, service.WorkOSOrganization{
			ID:   "org_webhook",
			Name: "New Name",
		}),
	}); err != nil {
		t.Fatalf("organization.updated webhook returned error: %v", err)
	}
	updated, err := model.GetTeamById(team.Id)
	if err != nil {
		t.Fatalf("GetTeamById returned error: %v", err)
	}
	if updated.Name != "New Name" {
		t.Fatalf("team name = %q, want New Name", updated.Name)
	}

	if err := handleWorkOSTeamWebhookEvent(nil, &service.WorkOSWebhookEvent{
		Type: "organization.deleted",
		Data: mustRawJSON(t, service.WorkOSOrganization{ID: "org_webhook"}),
	}); err != nil {
		t.Fatalf("organization.deleted webhook returned error: %v", err)
	}
	if _, err := model.GetTeamById(team.Id); err == nil {
		t.Fatalf("deleted WorkOS organization should mark local team deleted")
	}
	var membership model.TeamMembership
	if err := db.First(&membership, "team_id = ? AND user_id = ?", team.Id, creator.Id).Error; err != nil {
		t.Fatalf("failed to reload membership: %v", err)
	}
	if membership.Status != model.MembershipInactive {
		t.Fatalf("membership status = %q, want inactive", membership.Status)
	}
}

func TestHandleWorkOSMembershipWebhookAcceptsMatchingInvitation(t *testing.T) {
	db := setupTeamControllerTestDB(t)
	creator := seedTeamControllerUser(t, db, "user_team_inviter", "inviter@example.com", "workos_inviter")
	invitee := seedTeamControllerUser(t, db, "user_team_invitee", "invitee@example.com", "workos_invitee")
	team, err := model.CreateTeamWithCreator(model.CreateTeamParams{
		Name:                 "Invite Team",
		CreatedByUserId:      creator.Id,
		WorkOSOrganizationId: "org_invite",
		WorkOSMembershipId:   "om_inviter",
	})
	if err != nil {
		t.Fatalf("CreateTeamWithCreator returned error: %v", err)
	}
	if _, err := model.CreateTeamInvitation(model.InviteTeamMemberParams{
		TeamId:             team.Id,
		Email:              invitee.Email,
		Role:               model.TeamRoleMember,
		InvitedByUserId:    creator.Id,
		WorkOSInvitationId: "inv_invitee",
	}); err != nil {
		t.Fatalf("CreateTeamInvitation returned error: %v", err)
	}

	if err := handleWorkOSTeamWebhookEvent(nil, &service.WorkOSWebhookEvent{
		Type: "organization_membership.created",
		Data: mustRawJSON(t, service.WorkOSOrganizationMembership{
			ID:             "om_invitee",
			UserID:         invitee.WorkOSId,
			OrganizationID: team.WorkOSOrganizationId,
			Status:         model.MembershipActive,
			Role:           service.WorkOSRole{Slug: model.TeamRoleMember},
		}),
	}); err != nil {
		t.Fatalf("membership webhook returned error: %v", err)
	}
	membership, err := model.GetTeamMembership(team.Id, invitee.Id)
	if err != nil {
		t.Fatalf("invitee membership missing: %v", err)
	}
	if membership.Role != model.TeamRoleMember {
		t.Fatalf("membership role = %q, want member", membership.Role)
	}
	invitation, err := model.FindPendingTeamInvitationByEmail(team.Id, invitee.Email)
	if err == nil {
		t.Fatalf("invitation should no longer be pending: %+v", invitation)
	}
	var accepted model.TeamInvitation
	if err := db.First(&accepted, "workos_invitation_id = ?", "inv_invitee").Error; err != nil {
		t.Fatalf("failed to reload invitation: %v", err)
	}
	if accepted.Status != model.InvitationAccepted || accepted.AcceptedByUserId != invitee.Id {
		t.Fatalf("invitation status=%q accepted_by=%q, want accepted by invitee", accepted.Status, accepted.AcceptedByUserId)
	}
}

func TestInviteTeamMemberCreatesLocalInvitationBeforeCallingWorkOS(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupTeamControllerTestDB(t)
	inviter := seedTeamControllerUser(t, db, "user_team_invite_order_admin", "invite-order-admin@example.com", "workos_invite_order_admin")
	team, err := model.CreateTeamWithCreator(model.CreateTeamParams{
		Name:                 "Invite Order Team",
		CreatedByUserId:      inviter.Id,
		WorkOSOrganizationId: "org_invite_order",
		WorkOSMembershipId:   "om_invite_order_admin",
	})
	if err != nil {
		t.Fatalf("CreateTeamWithCreator returned error: %v", err)
	}

	var sawLocalBeforeWorkOS atomic.Bool
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost || r.URL.Path != "/user_management/invitations" {
			http.Error(w, "unexpected WorkOS request", http.StatusNotFound)
			return
		}
		pending, err := model.FindPendingTeamInvitationByEmail(team.Id, "invitee@example.com")
		if err == nil && pending.Status == model.InvitationPending && strings.HasPrefix(pending.WorkOSInvitationId, "tinv_") {
			sawLocalBeforeWorkOS.Store(true)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"id":"inv_workos_order","email":"invitee@example.com","organization_id":"org_invite_order","state":"pending","expires_at":"2026-05-16T00:00:00Z"}`))
	}))
	t.Cleanup(server.Close)
	t.Setenv("WORKOS_API_BASE_URL", server.URL)
	t.Setenv("WORKOS_API_KEY", "sk_test")
	t.Setenv("WORKOS_CLIENT_ID", "client_test")
	t.Setenv("WORKOS_REDIRECT_URI", "http://app.example.com/api/workos/callback")

	payload, err := json.Marshal(inviteTeamMemberRequest{
		TeamId: team.Id,
		Email:  "invitee@example.com",
		Role:   model.TeamRoleMember,
	})
	if err != nil {
		t.Fatalf("failed to marshal invite payload: %v", err)
	}
	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(http.MethodPost, "/api/teams/invite", bytes.NewReader(payload))
	ctx.Request.Header.Set("Content-Type", "application/json")
	ctx.Set("id", inviter.Id)

	InviteTeamMember(ctx)

	if recorder.Code != http.StatusOK {
		t.Fatalf("InviteTeamMember status = %d, body = %s", recorder.Code, recorder.Body.String())
	}
	if !sawLocalBeforeWorkOS.Load() {
		t.Fatalf("local pending invitation was not visible before WorkOS invitation request")
	}
	pending, err := model.FindPendingTeamInvitationByEmail(team.Id, "invitee@example.com")
	if err != nil {
		t.Fatalf("pending invitation missing after invite: %v", err)
	}
	if pending.WorkOSInvitationId != "inv_workos_order" {
		t.Fatalf("workos invitation id = %q, want inv_workos_order", pending.WorkOSInvitationId)
	}
}
