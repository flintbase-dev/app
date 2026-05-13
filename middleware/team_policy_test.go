package middleware

import (
	"net/http/httptest"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/internal/testdb"
	"github.com/QuantumNous/new-api/model"
	"github.com/gin-gonic/gin"
)

func TestEnforceTeamTokenPolicyRejectsDisabledModelAndGroup(t *testing.T) {
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

	user := &model.User{
		Id:       "user_team_policy",
		Username: "user_team_policy",
		Email:    "policy@example.com",
		WorkOSId: "workos_policy",
		Status:   common.UserStatusEnabled,
		Role:     common.RoleCommonUser,
		Group:    "default",
	}
	if err := db.Create(user).Error; err != nil {
		t.Fatalf("failed to seed user: %v", err)
	}
	team, err := model.CreateTeamWithCreator(model.CreateTeamParams{
		Name:                 "Policy Team",
		CreatedByUserId:      user.Id,
		WorkOSOrganizationId: "org_policy",
		WorkOSMembershipId:   "om_policy",
	})
	if err != nil {
		t.Fatalf("CreateTeamWithCreator returned error: %v", err)
	}
	if _, err := model.UpdateTeamPolicy(team.Id, user.Id, model.PolicyToggleSet{
		DefaultEnabled: true,
		Disabled:       []string{"gpt-4.1"},
	}, model.PolicyToggleSet{
		DefaultEnabled: true,
		Disabled:       []string{"premium"},
	}); err != nil {
		t.Fatalf("UpdateTeamPolicy returned error: %v", err)
	}

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	common.SetContextKey(ctx, constant.ContextKeyTeamId, team.Id)
	common.SetContextKey(ctx, constant.ContextKeyUsingGroup, "default")
	if err := enforceTeamTokenPolicy(ctx, &ModelRequest{Model: "gpt-4.1"}); err == nil {
		t.Fatalf("disabled model should be rejected")
	}

	recorder = httptest.NewRecorder()
	ctx, _ = gin.CreateTestContext(recorder)
	common.SetContextKey(ctx, constant.ContextKeyTeamId, team.Id)
	common.SetContextKey(ctx, constant.ContextKeyUsingGroup, "premium")
	if err := enforceTeamTokenPolicy(ctx, &ModelRequest{Model: "gpt-4o"}); err == nil {
		t.Fatalf("disabled group should be rejected")
	}

	recorder = httptest.NewRecorder()
	ctx, _ = gin.CreateTestContext(recorder)
	common.SetContextKey(ctx, constant.ContextKeyTeamId, team.Id)
	common.SetContextKey(ctx, constant.ContextKeyUsingGroup, "default")
	if err := enforceTeamTokenPolicy(ctx, &ModelRequest{Model: "gpt-4o"}); err != nil {
		t.Fatalf("allowed model and group should pass: %v", err)
	}

	recorder = httptest.NewRecorder()
	ctx, _ = gin.CreateTestContext(recorder)
	common.SetContextKey(ctx, constant.ContextKeyUsingGroup, "premium")
	if err := enforceTeamTokenPolicy(ctx, &ModelRequest{Model: "gpt-4.1"}); err != nil {
		t.Fatalf("empty team id should skip policy checks: %v", err)
	}

	recorder = httptest.NewRecorder()
	ctx, _ = gin.CreateTestContext(recorder)
	common.SetContextKey(ctx, constant.ContextKeyTeamId, team.Id)
	if err := enforceTeamTokenPolicy(ctx, nil); err != nil {
		t.Fatalf("nil model request should skip policy checks: %v", err)
	}
}
