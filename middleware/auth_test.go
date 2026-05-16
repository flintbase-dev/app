package middleware

import (
	"net/http/httptest"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/internal/testdb"
	"github.com/QuantumNous/new-api/model"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func TestValidateTokenAccountContextFailsClosedOnMissingOwnership(t *testing.T) {
	prevGinMode := gin.Mode()
	t.Cleanup(func() {
		gin.SetMode(prevGinMode)
	})
	gin.SetMode(gin.TestMode)

	userId := common.MustNewTypedID("usr", 12)
	tests := []struct {
		name  string
		token *model.Token
	}{
		{
			name: "missing account id",
			token: &model.Token{
				UserId:          userId,
				CreatedByUserId: userId,
				AccountType:     model.AccountTypePersonal,
			},
		},
		{
			name: "missing account type",
			token: &model.Token{
				UserId:          userId,
				CreatedByUserId: userId,
				AccountId:       userId,
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctx, _ := gin.CreateTestContext(httptest.NewRecorder())
			if err := validateTokenAccountContext(ctx, tt.token); err == nil {
				t.Fatalf("expected missing ownership to be rejected")
			}
		})
	}
}

func TestValidateTokenAccountContextAcceptsPersonalOwnership(t *testing.T) {
	prevGinMode := gin.Mode()
	t.Cleanup(func() {
		gin.SetMode(prevGinMode)
	})
	gin.SetMode(gin.TestMode)

	userId := common.MustNewTypedID("usr", 12)
	ctx, _ := gin.CreateTestContext(httptest.NewRecorder())
	err := validateTokenAccountContext(ctx, &model.Token{
		UserId:          userId,
		CreatedByUserId: userId,
		AccountType:     model.AccountTypePersonal,
		AccountId:       userId,
	})
	if err != nil {
		t.Fatalf("expected valid personal ownership to pass: %v", err)
	}
	if got := common.GetContextKeyString(ctx, constant.ContextKeyAccountType); got != model.AccountTypePersonal {
		t.Fatalf("account type context = %q, want %q", got, model.AccountTypePersonal)
	}
	if got := common.GetContextKeyString(ctx, constant.ContextKeyAccountId); got != userId {
		t.Fatalf("account id context = %q, want %q", got, userId)
	}
}

func TestValidateTokenAccountContextAcceptsTeamOwnership(t *testing.T) {
	db := setupAuthMiddlewareTestDB(t)
	creator := seedAuthMiddlewareUser(t, db, common.MustNewTypedID("usr", 12), "team-auth@example.com", "workos_team_auth")
	team, err := model.CreateTeamWithCreator(model.CreateTeamParams{
		Name:                 "Auth Team",
		CreatedByUserId:      creator.Id,
		WorkOSOrganizationId: "org_auth_team",
		WorkOSMembershipId:   "om_auth_team",
	})
	if err != nil {
		t.Fatalf("CreateTeamWithCreator returned error: %v", err)
	}
	if _, err := model.AdminUpdateTeam(team.Id, team.Name, "enterprise", team.Quota); err != nil {
		t.Fatalf("AdminUpdateTeam returned error: %v", err)
	}

	ctx, _ := gin.CreateTestContext(httptest.NewRecorder())
	err = validateTokenAccountContext(ctx, &model.Token{
		UserId:          creator.Id,
		CreatedByUserId: creator.Id,
		AccountType:     model.AccountTypeTeam,
		AccountId:       team.Id,
	})
	if err != nil {
		t.Fatalf("expected valid team ownership to pass: %v", err)
	}
	if got := common.GetContextKeyString(ctx, constant.ContextKeyAccountType); got != model.AccountTypeTeam {
		t.Fatalf("account type context = %q, want %q", got, model.AccountTypeTeam)
	}
	if got := common.GetContextKeyString(ctx, constant.ContextKeyAccountId); got != team.Id {
		t.Fatalf("account id context = %q, want %q", got, team.Id)
	}
	if got := common.GetContextKeyString(ctx, constant.ContextKeyTeamId); got != team.Id {
		t.Fatalf("team id context = %q, want %q", got, team.Id)
	}
	if got := common.GetContextKeyString(ctx, constant.ContextKeyTeamGroup); got != "enterprise" {
		t.Fatalf("team group context = %q, want enterprise", got)
	}
}

func TestValidateTokenAccountContextRejectsInvalidTeamOwnership(t *testing.T) {
	db := setupAuthMiddlewareTestDB(t)
	creator := seedAuthMiddlewareUser(t, db, common.MustNewTypedID("usr", 12), "team-owner@example.com", "workos_team_owner")
	outsider := seedAuthMiddlewareUser(t, db, common.MustNewTypedID("usr", 12), "outsider@example.com", "workos_outsider")
	team, err := model.CreateTeamWithCreator(model.CreateTeamParams{
		Name:                 "Invalid Auth Team",
		CreatedByUserId:      creator.Id,
		WorkOSOrganizationId: "org_auth_invalid_team",
		WorkOSMembershipId:   "om_auth_invalid_team",
	})
	if err != nil {
		t.Fatalf("CreateTeamWithCreator returned error: %v", err)
	}

	tests := []struct {
		name  string
		token *model.Token
	}{
		{
			name: "missing membership",
			token: &model.Token{
				UserId:          outsider.Id,
				CreatedByUserId: outsider.Id,
				AccountType:     model.AccountTypeTeam,
				AccountId:       team.Id,
			},
		},
		{
			name: "missing team",
			token: &model.Token{
				UserId:          creator.Id,
				CreatedByUserId: creator.Id,
				AccountType:     model.AccountTypeTeam,
				AccountId:       common.MustNewTypedID("team", 12),
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctx, _ := gin.CreateTestContext(httptest.NewRecorder())
			if err := validateTokenAccountContext(ctx, tt.token); err == nil {
				t.Fatalf("expected invalid team ownership to be rejected")
			}
		})
	}
}

func setupAuthMiddlewareTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	prevGinMode := gin.Mode()
	prevRedisEnabled := common.RedisEnabled
	prevDB := model.DB
	prevLogDB := model.LOG_DB
	t.Cleanup(func() {
		gin.SetMode(prevGinMode)
		common.RedisEnabled = prevRedisEnabled
		model.DB = prevDB
		model.LOG_DB = prevLogDB
	})

	gin.SetMode(gin.TestMode)
	common.RedisEnabled = false
	db := testdb.OpenAndReset(t)
	model.DB = db
	model.LOG_DB = db
	return db
}

func seedAuthMiddlewareUser(t *testing.T, db *gorm.DB, id string, email string, workOSId string) *model.User {
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
