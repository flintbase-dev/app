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

func TestAdminDeactivateTeamDeletesWorkOSOrganizationAndLocalTeam(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupTeamControllerTestDB(t)
	creator := seedTeamControllerUser(t, db, "user_admin_deactivate_team", "admin-deactivate@example.com", "workos_admin_deactivate")
	team, err := model.CreateTeamWithCreator(model.CreateTeamParams{
		Name:                 "Admin Deactivate Team",
		CreatedByUserId:      creator.Id,
		WorkOSOrganizationId: "org_admin_deactivate",
		WorkOSMembershipId:   "om_admin_deactivate",
	})
	if err != nil {
		t.Fatalf("CreateTeamWithCreator returned error: %v", err)
	}

	var sawDelete atomic.Bool
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodDelete || r.URL.Path != "/organizations/org_admin_deactivate" {
			http.Error(w, "unexpected WorkOS request", http.StatusNotFound)
			return
		}
		sawDelete.Store(true)
		w.WriteHeader(http.StatusNoContent)
	}))
	t.Cleanup(server.Close)
	t.Setenv("WORKOS_API_BASE_URL", server.URL)
	t.Setenv("WORKOS_API_KEY", "sk_test")
	t.Setenv("WORKOS_CLIENT_ID", "client_test")
	t.Setenv("WORKOS_REDIRECT_URI", "http://app.example.com/api/workos/callback")

	payload, err := json.Marshal(map[string]string{"team_id": team.Id})
	if err != nil {
		t.Fatalf("failed to marshal deactivate payload: %v", err)
	}
	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(http.MethodPost, "/api/admin/teams/deactivate", bytes.NewReader(payload))
	ctx.Request.Header.Set("Content-Type", "application/json")
	ctx.Set("id", creator.Id)
	AdminDeactivateTeam(ctx)
	if recorder.Code != http.StatusOK {
		t.Fatalf("AdminDeactivateTeam status = %d, body = %s", recorder.Code, recorder.Body.String())
	}
	var response struct {
		Success bool   `json:"success"`
		Message string `json:"message"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("failed to decode response %q: %v", recorder.Body.String(), err)
	}
	if !response.Success {
		t.Fatalf("AdminDeactivateTeam failed: %+v", response)
	}
	if !sawDelete.Load() {
		t.Fatalf("WorkOS organization delete was not called")
	}
	if _, err := model.GetTeamById(team.Id); err == nil {
		t.Fatalf("team should no longer be active after admin deactivate")
	}
	var membership model.TeamMembership
	if err := db.First(&membership, "team_id = ? AND user_id = ?", team.Id, creator.Id).Error; err != nil {
		t.Fatalf("failed to reload team membership: %v", err)
	}
	if membership.Status != model.MembershipInactive {
		t.Fatalf("membership status = %q, want inactive", membership.Status)
	}
}

func TestManageUserDisableDeactivatesWorkOSMembershipsAndLocalTeamMemberships(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupTeamControllerTestDB(t)
	admin := seedTeamControllerUser(t, db, "user_disable_admin", "disable-admin@example.com", "workos_disable_admin")
	admin.Role = common.RoleAdminUser
	if err := db.Save(admin).Error; err != nil {
		t.Fatalf("failed to promote admin user: %v", err)
	}
	target := seedTeamControllerUser(t, db, "user_disable_target", "disable-target@example.com", "workos_disable_target")
	team, err := model.CreateTeamWithCreator(model.CreateTeamParams{
		Name:                 "Disable Target Team",
		CreatedByUserId:      admin.Id,
		WorkOSOrganizationId: "org_disable_target",
		WorkOSMembershipId:   "om_disable_admin",
	})
	if err != nil {
		t.Fatalf("CreateTeamWithCreator returned error: %v", err)
	}
	if _, err := model.SyncTeamMembership(model.SyncTeamMembershipParams{
		TeamId:                         team.Id,
		UserId:                         target.Id,
		WorkOSOrganizationMembershipId: "om_disable_target",
		Role:                           model.TeamRoleMember,
		Status:                         model.MembershipActive,
	}); err != nil {
		t.Fatalf("SyncTeamMembership returned error: %v", err)
	}

	var deactivated []string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case r.Method == http.MethodGet && r.URL.Path == "/user_management/organization_memberships":
			if got := r.URL.Query().Get("user_id"); got != "workos_disable_target" {
				t.Fatalf("user_id query = %q, want workos_disable_target", got)
			}
			w.Header().Set("Content-Type", "application/json")
			_, _ = w.Write([]byte(`{"data":[{"id":"om_disable_target","status":"active"},{"id":"om_disable_inactive","status":"inactive"}]}`))
		case r.Method == http.MethodPut && r.URL.Path == "/user_management/organization_memberships/om_disable_target/deactivate":
			deactivated = append(deactivated, r.URL.Path)
			w.Header().Set("Content-Type", "application/json")
			_, _ = w.Write([]byte(`{"id":"om_disable_target","status":"inactive"}`))
		default:
			http.Error(w, "unexpected WorkOS request", http.StatusNotFound)
		}
	}))
	t.Cleanup(server.Close)
	t.Setenv("WORKOS_API_BASE_URL", server.URL)
	t.Setenv("WORKOS_API_KEY", "sk_test")
	t.Setenv("WORKOS_CLIENT_ID", "client_test")
	t.Setenv("WORKOS_REDIRECT_URI", "http://app.example.com/api/workos/callback")

	response := performTeamControllerRequest(t, ManageUser, http.MethodPost, "/api/admin/users/manage", ManageRequest{
		Id:     target.Id,
		Action: "disable",
	}, admin.Id)
	if !response.Success {
		t.Fatalf("ManageUser disable failed: %+v", response)
	}
	if len(deactivated) != 1 {
		t.Fatalf("deactivated WorkOS memberships = %+v, want one active membership", deactivated)
	}
	disabled, err := model.GetUserById(target.Id, false)
	if err != nil {
		t.Fatalf("failed to reload disabled user: %v", err)
	}
	if disabled.Status != common.UserStatusDisabled {
		t.Fatalf("user status = %d, want disabled", disabled.Status)
	}
	var membership model.TeamMembership
	if err := db.First(&membership, "team_id = ? AND user_id = ?", team.Id, target.Id).Error; err != nil {
		t.Fatalf("failed to reload team membership: %v", err)
	}
	if membership.Status != model.MembershipInactive {
		t.Fatalf("membership status = %q, want inactive", membership.Status)
	}
}

func TestTeamTokenSecretRevealPermissionMatrix(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupTeamControllerTestDB(t)
	admin := seedTeamControllerUser(t, db, "user_team_token_admin", "team-token-admin@example.com", "workos_team_token_admin")
	member := seedTeamControllerUser(t, db, "user_team_token_member", "team-token-member@example.com", "workos_team_token_member")
	outsider := seedTeamControllerUser(t, db, "user_team_token_outsider", "team-token-outsider@example.com", "workos_team_token_outsider")
	team, err := model.CreateTeamWithCreator(model.CreateTeamParams{
		Name:                 "Token Permission Team",
		CreatedByUserId:      admin.Id,
		WorkOSOrganizationId: "org_token_permissions",
		WorkOSMembershipId:   "om_token_permissions_admin",
	})
	if err != nil {
		t.Fatalf("CreateTeamWithCreator returned error: %v", err)
	}
	if _, err := model.SyncTeamMembership(model.SyncTeamMembershipParams{
		TeamId:                         team.Id,
		UserId:                         member.Id,
		WorkOSOrganizationMembershipId: "om_token_permissions_member",
		Role:                           model.TeamRoleMember,
		Status:                         model.MembershipActive,
	}); err != nil {
		t.Fatalf("SyncTeamMembership returned error: %v", err)
	}

	memberToken := seedTeamControllerToken(t, model.Token{
		UserId:          member.Id,
		CreatedByUserId: member.Id,
		AccountType:     model.AccountTypeTeam,
		AccountId:       team.Id,
		Key:             "sk-member-secret",
		Name:            "member token",
		Status:          common.TokenStatusEnabled,
	})
	adminToken := seedTeamControllerToken(t, model.Token{
		UserId:          admin.Id,
		CreatedByUserId: admin.Id,
		AccountType:     model.AccountTypeTeam,
		AccountId:       team.Id,
		Key:             "sk-admin-secret",
		Name:            "admin token",
		Status:          common.TokenStatusEnabled,
	})

	single := performTeamControllerRequest(t, GetTeamTokenKey, http.MethodGet, "/api/teams/tokens/key?team_id="+team.Id+"&id="+memberToken.Id, nil, member.Id)
	if !single.Success || single.Data["key"] != memberToken.Key {
		t.Fatalf("member should reveal own token, got %+v", single)
	}
	single = performTeamControllerRequest(t, GetTeamTokenKey, http.MethodGet, "/api/teams/tokens/key?team_id="+team.Id+"&id="+adminToken.Id, nil, member.Id)
	if single.Success {
		t.Fatalf("member should not reveal another member token")
	}
	single = performTeamControllerRequest(t, GetTeamTokenKey, http.MethodGet, "/api/teams/tokens/key?team_id="+team.Id+"&id="+memberToken.Id, nil, admin.Id)
	if !single.Success || single.Data["key"] != memberToken.Key {
		t.Fatalf("admin should reveal team member token, got %+v", single)
	}
	single = performTeamControllerRequest(t, GetTeamTokenKey, http.MethodGet, "/api/teams/tokens/key?team_id="+team.Id+"&id="+memberToken.Id, nil, outsider.Id)
	if single.Success {
		t.Fatalf("non-member should not reveal team token")
	}

	batchBody := teamTokenBatch{TeamId: team.Id, Ids: []string{memberToken.Id, adminToken.Id}}
	batch := performTeamControllerRequest(t, GetTeamTokenKeysBatch, http.MethodPost, "/api/teams/tokens/keys", batchBody, member.Id)
	memberKeys := responseDataMap(t, batch, "keys")
	if !batch.Success || memberKeys[memberToken.Id] != memberToken.Key {
		t.Fatalf("member batch should include own token, got %+v", batch)
	}
	if _, ok := memberKeys[adminToken.Id]; ok {
		t.Fatalf("member batch should not include another member token")
	}
	batch = performTeamControllerRequest(t, GetTeamTokenKeysBatch, http.MethodPost, "/api/teams/tokens/keys", batchBody, admin.Id)
	adminKeys := responseDataMap(t, batch, "keys")
	if !batch.Success || adminKeys[memberToken.Id] != memberToken.Key || adminKeys[adminToken.Id] != adminToken.Key {
		t.Fatalf("admin batch should include all requested team token secrets, got %+v", batch)
	}
	batch = performTeamControllerRequest(t, GetTeamTokenKeysBatch, http.MethodPost, "/api/teams/tokens/keys", batchBody, outsider.Id)
	if batch.Success {
		t.Fatalf("non-member batch should not reveal team token secrets")
	}
}

type teamControllerResponse struct {
	Success bool                   `json:"success"`
	Message string                 `json:"message"`
	Data    map[string]interface{} `json:"data"`
}

func seedTeamControllerToken(t *testing.T, token model.Token) *model.Token {
	t.Helper()
	token.CreatedTime = common.GetTimestamp()
	token.AccessedTime = token.CreatedTime
	token.ExpiredTime = -1
	if err := token.Insert(); err != nil {
		t.Fatalf("failed to seed token: %v", err)
	}
	return &token
}

func performTeamControllerRequest(t *testing.T, handler gin.HandlerFunc, method string, target string, body any, userId string) teamControllerResponse {
	t.Helper()
	var requestBody *bytes.Reader
	if body == nil {
		requestBody = bytes.NewReader(nil)
	} else {
		payload, err := json.Marshal(body)
		if err != nil {
			t.Fatalf("failed to marshal request body: %v", err)
		}
		requestBody = bytes.NewReader(payload)
	}
	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(method, target, requestBody)
	ctx.Request.Header.Set("Content-Type", "application/json")
	ctx.Set("id", userId)
	if userId != "" {
		if user, err := model.GetUserById(userId, false); err == nil {
			ctx.Set("role", user.Role)
			ctx.Set("username", user.Username)
		}
	}

	handler(ctx)

	if recorder.Code != http.StatusOK {
		t.Fatalf("handler status = %d, body = %s", recorder.Code, recorder.Body.String())
	}
	var response teamControllerResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("failed to decode response %q: %v", recorder.Body.String(), err)
	}
	return response
}

func responseDataMap(t *testing.T, response teamControllerResponse, key string) map[string]interface{} {
	t.Helper()
	value, ok := response.Data[key]
	if !ok {
		t.Fatalf("response data missing key %q: %+v", key, response)
	}
	mapped, ok := value.(map[string]interface{})
	if !ok {
		t.Fatalf("response data key %q = %T, want object", key, value)
	}
	return mapped
}
