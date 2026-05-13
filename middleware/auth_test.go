package middleware

import (
	"net/http/httptest"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/model"
	"github.com/gin-gonic/gin"
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
