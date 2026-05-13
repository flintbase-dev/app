package controller

import (
	"encoding/json"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/internal/testdb"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/service"
	"gorm.io/gorm"
)

func setupTeamControllerTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	common.RedisEnabled = false
	db := testdb.OpenAndReset(t)
	model.DB = db
	model.LOG_DB = db
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
