package service

import (
	"errors"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/QuantumNous/new-api/dto"
	"github.com/QuantumNous/new-api/model"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
	"github.com/QuantumNous/new-api/types"
	"github.com/gin-gonic/gin"
)

func TestPostConsumeQuotaRejectsNilRelayInfo(t *testing.T) {
	if err := PostConsumeQuota(nil, 1, 0, false); err == nil {
		t.Fatal("expected nil relay info to be rejected")
	}
}

func TestPostConsumeQuotaRejectsInvalidAccountContext(t *testing.T) {
	err := PostConsumeQuota(&relaycommon.RelayInfo{
		UserId:      "user_test",
		AccountType: model.AccountTypeTeam,
		AccountId:   "user_test",
		RequestId:   "req_test",
	}, 1, 0, false)
	if err == nil {
		t.Fatal("expected invalid account context to be rejected")
	}
	if !strings.Contains(err.Error(), "invalid account context") {
		t.Fatalf("error = %q, want invalid account context", err.Error())
	}
}

func TestPostConsumeQuotaRejectsPartialAccountContext(t *testing.T) {
	err := PostConsumeQuota(&relaycommon.RelayInfo{
		UserId:      "usr_test",
		AccountType: model.AccountTypeTeam,
		RequestId:   "req_test",
	}, 1, 0, false)
	if err == nil {
		t.Fatal("expected partial account context to be rejected")
	}
	if !strings.Contains(err.Error(), "partial account context") {
		t.Fatalf("error = %q, want partial account context", err.Error())
	}
}

func TestResolveRelayAccountContextNormalizesTeamContext(t *testing.T) {
	teamId := "team_testcontext"
	relayInfo := &relaycommon.RelayInfo{
		UserId:      "usr_testcontext",
		AccountType: " team ",
		AccountId:   " " + teamId + " ",
		RequestId:   "req_test",
	}

	account, err := ResolveRelayAccountContext(relayInfo)
	if err != nil {
		t.Fatalf("ResolveRelayAccountContext returned error: %v", err)
	}
	if account.Type != model.AccountTypeTeam || account.Id != teamId {
		t.Fatalf("account = %+v, want team %s", account, teamId)
	}
	if relayInfo.AccountType != model.AccountTypeTeam || relayInfo.AccountId != teamId {
		t.Fatalf("relayInfo account = %s:%s, want normalized team context", relayInfo.AccountType, relayInfo.AccountId)
	}
}

func TestPostTextConsumeQuotaRejectsInvalidAccountContext(t *testing.T) {
	prevGinMode := gin.Mode()
	t.Cleanup(func() {
		gin.SetMode(prevGinMode)
	})
	gin.SetMode(gin.TestMode)
	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)

	err := PostTextConsumeQuota(ctx, &relaycommon.RelayInfo{
		UserId:      "usr_textquota",
		AccountType: model.AccountTypeTeam,
		AccountId:   "usr_textquota",
		RequestId:   "req_textquota",
	}, &dto.Usage{TotalTokens: 1}, nil)
	if err == nil {
		t.Fatal("expected invalid account context to be rejected")
	}
	if !strings.Contains(err.Error(), "invalid account context") {
		t.Fatalf("error = %q, want invalid account context", err.Error())
	}
}

func TestChargeViolationFeeRejectsInvalidAccountContext(t *testing.T) {
	prevGinMode := gin.Mode()
	t.Cleanup(func() {
		gin.SetMode(prevGinMode)
	})
	gin.SetMode(gin.TestMode)
	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)

	charged := ChargeViolationFeeIfNeeded(ctx, &relaycommon.RelayInfo{
		UserId:      "usr_violation",
		AccountType: model.AccountTypeTeam,
		AccountId:   "usr_violation",
		RequestId:   "req_violation",
		PriceData: types.PriceData{GroupRatioInfo: types.GroupRatioInfo{
			GroupRatio: 1,
		}},
	}, types.NewError(errors.New(CSAMViolationMarker), types.ErrorCodeViolationFeeGrokCSAM))
	if charged {
		t.Fatal("invalid account context should not charge a violation fee")
	}
}
