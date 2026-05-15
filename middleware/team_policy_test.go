package middleware

import (
	"bytes"
	"net/http"
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
	common.SetContextKey(ctx, constant.ContextKeyUsingGroup, "default")
	if err := enforceTeamTokenPolicy(ctx, &ModelRequest{Model: "gpt-4.1-2025-04-14"}); err == nil {
		t.Fatalf("versioned alias of disabled canonical model should be rejected")
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

func TestDistributeRejectsDisabledTeamGroupAfterChannelContext(t *testing.T) {
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
		Id:       common.MustNewTypedID("usr", 12),
		Username: "team-policy-distributor",
		Email:    "team-policy-distributor@example.com",
		WorkOSId: "workos_team_policy_distributor",
		Status:   common.UserStatusEnabled,
		Role:     common.RoleCommonUser,
		Group:    "default",
	}
	if err := db.Create(user).Error; err != nil {
		t.Fatalf("failed to seed user: %v", err)
	}
	team, err := model.CreateTeamWithCreator(model.CreateTeamParams{
		Name:                 "Distributor Policy Team",
		CreatedByUserId:      user.Id,
		WorkOSOrganizationId: "org_policy_distributor",
		WorkOSMembershipId:   "om_policy_distributor",
	})
	if err != nil {
		t.Fatalf("CreateTeamWithCreator returned error: %v", err)
	}
	if _, err := model.UpdateTeamPolicy(team.Id, user.Id, model.PolicyToggleSet{
		DefaultEnabled: true,
		Disabled:       []string{},
	}, model.PolicyToggleSet{
		DefaultEnabled: true,
		Disabled:       []string{"premium"},
	}); err != nil {
		t.Fatalf("UpdateTeamPolicy returned error: %v", err)
	}
	baseURL := "https://upstream.example"
	channel := &model.Channel{
		Type:    constant.ChannelTypeOpenAI,
		Key:     "sk-test",
		Status:  common.ChannelStatusEnabled,
		Name:    "premium-test",
		BaseURL: &baseURL,
		Models:  "gpt-4o",
		Group:   "premium",
	}
	if err := db.Create(channel).Error; err != nil {
		t.Fatalf("failed to seed channel: %v", err)
	}

	router := gin.New()
	router.Use(func(c *gin.Context) {
		common.SetContextKey(c, constant.ContextKeyTeamId, team.Id)
		common.SetContextKey(c, constant.ContextKeyUsingGroup, "premium")
		common.SetContextKey(c, constant.ContextKeyTokenSpecificChannelId, channel.Id)
		c.Set("id", user.Id)
		c.Next()
	})
	router.Use(Distribute())
	router.POST("/v1/chat/completions", func(c *gin.Context) {
		c.Status(http.StatusNoContent)
	})

	request := httptest.NewRequest(http.MethodPost, "/v1/chat/completions", bytes.NewBufferString(`{"model":"gpt-4o"}`))
	request.Header.Set("Content-Type", "application/json")
	recorder := httptest.NewRecorder()
	router.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusForbidden {
		t.Fatalf("status = %d, body = %s; want forbidden for disabled team group", recorder.Code, recorder.Body.String())
	}
}
