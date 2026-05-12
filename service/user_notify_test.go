package service

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/dto"
)

func resetEmailNotificationTestState(t *testing.T) {
	t.Helper()

	originalRedisEnabled := common.RedisEnabled
	originalAPIBaseURL := common.PostmarkAPIBaseURL
	originalFrom := common.PostmarkFrom
	originalToken := common.PostmarkServerToken
	originalMessageStream := common.PostmarkMessageStream
	originalSystemName := common.SystemName
	originalNotifyLimitCount := constant.NotifyLimitCount
	originalNotifyLimitDurationMinute := constant.NotificationLimitDurationMinute
	notifyLimitStore = sync.Map{}
	constant.NotifyLimitCount = 10
	constant.NotificationLimitDurationMinute = 60

	t.Cleanup(func() {
		common.RedisEnabled = originalRedisEnabled
		common.PostmarkAPIBaseURL = originalAPIBaseURL
		common.PostmarkFrom = originalFrom
		common.PostmarkServerToken = originalToken
		common.PostmarkMessageStream = originalMessageStream
		common.SystemName = originalSystemName
		constant.NotifyLimitCount = originalNotifyLimitCount
		constant.NotificationLimitDurationMinute = originalNotifyLimitDurationMinute
		notifyLimitStore = sync.Map{}
	})
}

func TestNotifyUserSendsOnlyToAccountEmail(t *testing.T) {
	resetEmailNotificationTestState(t)

	var gotPath string
	var gotPayload map[string]string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotPath = r.URL.Path
		if r.Header.Get("X-Postmark-Server-Token") != "server-token" {
			t.Fatalf("postmark token = %q", r.Header.Get("X-Postmark-Server-Token"))
		}
		if err := json.NewDecoder(r.Body).Decode(&gotPayload); err != nil {
			t.Fatalf("decode postmark payload: %v", err)
		}
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"MessageID":"msg_test"}`))
	}))
	defer server.Close()

	common.RedisEnabled = false
	common.SystemName = "Flintbase"
	common.PostmarkAPIBaseURL = server.URL
	common.PostmarkFrom = "sender@example.com"
	common.PostmarkServerToken = "server-token"
	common.PostmarkMessageStream = "notifications"

	notification := dto.NewSensitiveNotify(
		dto.NotifyTypeQuotaExceed,
		"Quota warning",
		"Remaining quota: {{value}}",
		[]interface{}{"$1.23"},
	)
	if err := NotifyUser("user_notify_email", "account@example.com", notification); err != nil {
		t.Fatalf("NotifyUser returned error: %v", err)
	}

	if gotPath != "/email" {
		t.Fatalf("postmark path = %q, want /email", gotPath)
	}
	if gotPayload["To"] != "account@example.com" {
		t.Fatalf("postmark To = %q, want account@example.com", gotPayload["To"])
	}
	if gotPayload["HtmlBody"] != "Remaining quota: $1.23" {
		t.Fatalf("postmark HtmlBody = %q", gotPayload["HtmlBody"])
	}
}

func TestNotifyUserSkipsWhenAccountEmailMissing(t *testing.T) {
	resetEmailNotificationTestState(t)

	requestCount := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requestCount++
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	common.RedisEnabled = false
	common.PostmarkAPIBaseURL = server.URL
	common.PostmarkFrom = "sender@example.com"
	common.PostmarkServerToken = "server-token"

	notification := dto.NewSensitiveNotify(
		dto.NotifyTypeQuotaExceed,
		"Quota warning",
		"Remaining quota: {{value}}",
		[]interface{}{"$1.23"},
	)
	if err := NotifyUser("user_notify_no_email", "  ", notification); err != nil {
		t.Fatalf("NotifyUser returned error: %v", err)
	}

	if requestCount != 0 {
		t.Fatalf("postmark request count = %d, want 0", requestCount)
	}
}
