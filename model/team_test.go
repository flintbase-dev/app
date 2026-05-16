package model

import (
	"strings"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/internal/testdb"
	"gorm.io/gorm"
)

func setupTeamModelTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	prevRedisEnabled := common.RedisEnabled
	prevDB := DB
	prevLogDB := LOG_DB

	common.RedisEnabled = false
	db := testdb.OpenAndReset(t)
	DB = db
	LOG_DB = db

	t.Cleanup(func() {
		common.RedisEnabled = prevRedisEnabled
		DB = prevDB
		LOG_DB = prevLogDB
	})
	return db
}

func seedTeamTestUser(t *testing.T, db *gorm.DB, id string, email string, workOSId string) *User {
	t.Helper()

	user := &User{
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

func TestCreateTeamWithCreatorSeedsAdminPolicyAndLastAdminRules(t *testing.T) {
	db := setupTeamModelTestDB(t)
	creator := seedTeamTestUser(t, db, "user_team_creator", "creator@example.com", "workos_creator")
	admin := seedTeamTestUser(t, db, "user_team_admin", "admin@example.com", "workos_admin")

	team, err := CreateTeamWithCreator(CreateTeamParams{
		Name:                 "Acme Team",
		CreatedByUserId:      creator.Id,
		WorkOSOrganizationId: "org_acme",
		WorkOSMembershipId:   "om_creator",
	})
	if err != nil {
		t.Fatalf("CreateTeamWithCreator returned error: %v", err)
	}
	if !strings.HasPrefix(team.Id, "team_") {
		t.Fatalf("team id = %q, want team_ prefix", team.Id)
	}
	if team.Group != "default" {
		t.Fatalf("team group = %q, want default", team.Group)
	}

	membership, err := GetTeamMembership(team.Id, creator.Id)
	if err != nil {
		t.Fatalf("creator membership missing: %v", err)
	}
	if membership.Role != TeamRoleAdmin {
		t.Fatalf("creator role = %q, want admin", membership.Role)
	}
	policy, err := GetTeamPolicy(team.Id)
	if err != nil {
		t.Fatalf("team policy missing: %v", err)
	}
	if !TeamPolicyAllowsModel(policy, "gpt-4.1") || !TeamPolicyAllowsGroup(policy, "default") {
		t.Fatalf("default team policy should allow models and groups")
	}

	if err := EnsureCanUpdateTeamMemberRole(team.Id, creator.Id, TeamRoleMember); err == nil {
		t.Fatalf("expected last admin downgrade to be rejected")
	}
	if err := EnsureCanRemoveTeamMember(team.Id, creator.Id); err == nil {
		t.Fatalf("expected last admin removal to be rejected")
	}

	if _, err := SyncTeamMembership(SyncTeamMembershipParams{
		TeamId:                         team.Id,
		UserId:                         admin.Id,
		WorkOSOrganizationMembershipId: "om_admin",
		Role:                           TeamRoleAdmin,
		Status:                         MembershipActive,
	}); err != nil {
		t.Fatalf("failed to add second admin: %v", err)
	}
	if err := UpdateTeamMemberRole(team.Id, creator.Id, TeamRoleMember); err != nil {
		t.Fatalf("expected downgrade with another active admin to succeed: %v", err)
	}
}

func TestAdminTeamManagementUpdatesSearchesAndDeactivatesMemberships(t *testing.T) {
	db := setupTeamModelTestDB(t)
	creator := seedTeamTestUser(t, db, "user_admin_team_creator", "admin-team@example.com", "workos_admin_team")
	member := seedTeamTestUser(t, db, "user_admin_team_member", "admin-team-member@example.com", "workos_admin_team_member")
	team, err := CreateTeamWithCreator(CreateTeamParams{
		Name:                 "Admin Managed Team",
		CreatedByUserId:      creator.Id,
		WorkOSOrganizationId: "org_admin_managed",
		WorkOSMembershipId:   "om_admin_managed",
	})
	if err != nil {
		t.Fatalf("CreateTeamWithCreator returned error: %v", err)
	}
	if _, err := SyncTeamMembership(SyncTeamMembershipParams{
		TeamId:                         team.Id,
		UserId:                         member.Id,
		WorkOSOrganizationMembershipId: "om_admin_member",
		Role:                           TeamRoleMember,
		Status:                         MembershipActive,
	}); err != nil {
		t.Fatalf("SyncTeamMembership returned error: %v", err)
	}

	updated, err := AdminUpdateTeam(team.Id, "Updated Admin Team", "enterprise", 12345)
	if err != nil {
		t.Fatalf("AdminUpdateTeam returned error: %v", err)
	}
	if updated.Name != "Updated Admin Team" || updated.Group != "enterprise" || updated.Quota != 12345 {
		t.Fatalf("updated team = %+v, want name/group/quota changes", updated)
	}

	pageInfo := &common.PageInfo{Page: 1, PageSize: 20}
	teams, total, err := ListAdminTeams(pageInfo)
	if err != nil {
		t.Fatalf("ListAdminTeams returned error: %v", err)
	}
	if total != 1 || len(teams) != 1 {
		t.Fatalf("ListAdminTeams total=%d len=%d, want one team", total, len(teams))
	}
	if teams[0].ActiveMemberCount != 2 || teams[0].CreatedByEmail != creator.Email {
		t.Fatalf("admin team summary = %+v, want member count and creator email", teams[0])
	}

	searched, total, err := SearchAdminTeams("Updated", "enterprise", TeamStatusActive, 0, 20)
	if err != nil {
		t.Fatalf("SearchAdminTeams returned error: %v", err)
	}
	if total != 1 || len(searched) != 1 || searched[0].Id != team.Id {
		t.Fatalf("SearchAdminTeams total=%d teams=%+v, want updated team", total, searched)
	}

	if err := DeactivateUserTeamMemberships(member.Id); err != nil {
		t.Fatalf("DeactivateUserTeamMemberships returned error: %v", err)
	}
	var membership TeamMembership
	if err := db.First(&membership, "team_id = ? AND user_id = ?", team.Id, member.Id).Error; err != nil {
		t.Fatalf("failed to reload member membership: %v", err)
	}
	if membership.Status != MembershipInactive {
		t.Fatalf("membership status = %q, want inactive", membership.Status)
	}
}

func TestSyncTeamMembershipCannotRemoveLastActiveAdmin(t *testing.T) {
	db := setupTeamModelTestDB(t)
	creator := seedTeamTestUser(t, db, "user_team_sync_admin", "sync-admin@example.com", "workos_sync_admin")

	team, err := CreateTeamWithCreator(CreateTeamParams{
		Name:                 "Sync Guard Team",
		CreatedByUserId:      creator.Id,
		WorkOSOrganizationId: "org_sync_guard",
		WorkOSMembershipId:   "om_sync_admin",
	})
	if err != nil {
		t.Fatalf("CreateTeamWithCreator returned error: %v", err)
	}

	_, err = SyncTeamMembership(SyncTeamMembershipParams{
		TeamId:                         team.Id,
		UserId:                         creator.Id,
		WorkOSOrganizationMembershipId: "om_sync_admin",
		Role:                           TeamRoleMember,
		Status:                         MembershipActive,
	})
	if err == nil {
		t.Fatalf("expected last admin webhook demotion to be rejected")
	}

	_, err = SyncTeamMembership(SyncTeamMembershipParams{
		TeamId:                         team.Id,
		UserId:                         creator.Id,
		WorkOSOrganizationMembershipId: "om_sync_admin",
		Role:                           TeamRoleAdmin,
		Status:                         MembershipInactive,
	})
	if err == nil {
		t.Fatalf("expected last admin webhook removal to be rejected")
	}
}

func TestCreateTeamInvitationCanReserveLocalRowBeforeWorkOSId(t *testing.T) {
	db := setupTeamModelTestDB(t)
	creator := seedTeamTestUser(t, db, "user_team_invitation_admin", "invitation-admin@example.com", "workos_invitation_admin")
	team, err := CreateTeamWithCreator(CreateTeamParams{
		Name:                 "Invitation Team",
		CreatedByUserId:      creator.Id,
		WorkOSOrganizationId: "org_invitation",
		WorkOSMembershipId:   "om_invitation_admin",
	})
	if err != nil {
		t.Fatalf("CreateTeamWithCreator returned error: %v", err)
	}

	local, err := CreateTeamInvitation(InviteTeamMemberParams{
		TeamId:          team.Id,
		Email:           "Invitee@Example.com",
		Role:            TeamRoleMember,
		InvitedByUserId: creator.Id,
	})
	if err != nil {
		t.Fatalf("CreateTeamInvitation returned error: %v", err)
	}
	if local.WorkOSInvitationId != local.Id {
		t.Fatalf("reserved invitation workos id = %q, want local id %q", local.WorkOSInvitationId, local.Id)
	}
	pending, err := FindPendingTeamInvitationByEmail(team.Id, "invitee@example.com")
	if err != nil {
		t.Fatalf("reserved invitation should be discoverable by pending email lookup: %v", err)
	}
	if pending.Id != local.Id {
		t.Fatalf("pending invitation id = %q, want %q", pending.Id, local.Id)
	}

	attached, err := AttachWorkOSInvitationToTeamInvitation(local.Id, "inv_workos", 12345)
	if err != nil {
		t.Fatalf("AttachWorkOSInvitationToTeamInvitation returned error: %v", err)
	}
	if attached.WorkOSInvitationId != "inv_workos" {
		t.Fatalf("attached workos id = %q, want inv_workos", attached.WorkOSInvitationId)
	}
	if attached.ExpiresAt != 12345 {
		t.Fatalf("attached expires_at = %d, want 12345", attached.ExpiresAt)
	}
}

func TestTeamPolicyAndMembershipLimits(t *testing.T) {
	db := setupTeamModelTestDB(t)
	common.OptionMapRWMutex.Lock()
	previousLimit := common.OptionMap["max_team_memberships_per_user"]
	common.OptionMap["max_team_memberships_per_user"] = "1"
	common.OptionMapRWMutex.Unlock()
	t.Cleanup(func() {
		common.OptionMapRWMutex.Lock()
		if previousLimit == "" {
			delete(common.OptionMap, "max_team_memberships_per_user")
		} else {
			common.OptionMap["max_team_memberships_per_user"] = previousLimit
		}
		common.OptionMapRWMutex.Unlock()
	})

	user := seedTeamTestUser(t, db, "user_team_limited", "limited@example.com", "workos_limited")
	team, err := CreateTeamWithCreator(CreateTeamParams{
		Name:                 "Limited Team",
		CreatedByUserId:      user.Id,
		WorkOSOrganizationId: "org_limited_1",
		WorkOSMembershipId:   "om_limited_1",
	})
	if err != nil {
		t.Fatalf("CreateTeamWithCreator returned error: %v", err)
	}
	if _, err := UpdateTeamPolicy(team.Id, user.Id, PolicyToggleSet{
		DefaultEnabled: true,
		Disabled:       []string{"gpt-4.1"},
	}, PolicyToggleSet{
		DefaultEnabled: true,
		Disabled:       []string{"premium"},
	}); err != nil {
		t.Fatalf("UpdateTeamPolicy returned error: %v", err)
	}
	policy, err := GetTeamPolicy(team.Id)
	if err != nil {
		t.Fatalf("GetTeamPolicy returned error: %v", err)
	}
	if TeamPolicyAllowsModel(policy, "gpt-4.1") {
		t.Fatalf("disabled model should be rejected")
	}
	if TeamPolicyAllowsGroup(policy, "premium") {
		t.Fatalf("disabled group should be rejected")
	}

	otherTeam := &Team{
		Id:                   "team_limit_second",
		WorkOSOrganizationId: "org_limited_2",
		Name:                 "Second Team",
		Slug:                 "second-team",
		CreatedByUserId:      user.Id,
		Status:               TeamStatusActive,
	}
	if err := db.Create(otherTeam).Error; err != nil {
		t.Fatalf("failed to seed second team: %v", err)
	}
	_, err = SyncTeamMembership(SyncTeamMembershipParams{
		TeamId:                         otherTeam.Id,
		UserId:                         user.Id,
		WorkOSOrganizationMembershipId: "om_limited_2",
		Role:                           TeamRoleMember,
		Status:                         MembershipActive,
	})
	if err == nil || err.Error() != "team membership limit reached" {
		t.Fatalf("expected team membership limit error, got %v", err)
	}
}
