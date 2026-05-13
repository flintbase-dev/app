package model

import (
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/internal/testdb"
	"gorm.io/gorm"
)

func setupTeamModelTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	common.RedisEnabled = false
	db := testdb.OpenAndReset(t)
	DB = db
	LOG_DB = db
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
	if team.Id == "" || team.Id[:5] != "team_" {
		t.Fatalf("team id = %q, want team_ prefix", team.Id)
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
