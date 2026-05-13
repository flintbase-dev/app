package service

import (
	"strings"
	"testing"

	"github.com/QuantumNous/new-api/model"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
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
