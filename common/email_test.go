package common

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"testing"
)

type roundTripFunc func(*http.Request) (*http.Response, error)

func (fn roundTripFunc) RoundTrip(req *http.Request) (*http.Response, error) {
	return fn(req)
}

func resetPostmarkSettings(t *testing.T) {
	t.Helper()

	originalAPIBaseURL := PostmarkAPIBaseURL
	originalFrom := PostmarkFrom
	originalToken := PostmarkServerToken
	originalMessageStream := PostmarkMessageStream
	originalSystemName := SystemName
	originalHTTPClient := postmarkHTTPClient

	t.Cleanup(func() {
		PostmarkAPIBaseURL = originalAPIBaseURL
		PostmarkFrom = originalFrom
		PostmarkServerToken = originalToken
		PostmarkMessageStream = originalMessageStream
		SystemName = originalSystemName
		postmarkHTTPClient = originalHTTPClient
	})
}

func TestSendEmailPostsPostmarkPayload(t *testing.T) {
	resetPostmarkSettings(t)

	var gotPath string
	var gotToken string
	var gotPayload postmarkEmailRequest

	SystemName = "Flintbase"
	PostmarkAPIBaseURL = "https://postmark.test"
	PostmarkFrom = "sender@example.com"
	PostmarkServerToken = "server-token"
	PostmarkMessageStream = "broadcast"
	postmarkHTTPClient = &http.Client{
		Transport: roundTripFunc(func(r *http.Request) (*http.Response, error) {
			gotPath = r.URL.Path
			gotToken = r.Header.Get("X-Postmark-Server-Token")
			if r.Header.Get("Content-Type") != "application/json" {
				t.Fatalf("Content-Type = %q", r.Header.Get("Content-Type"))
			}
			if err := json.NewDecoder(r.Body).Decode(&gotPayload); err != nil {
				t.Fatalf("decode request: %v", err)
			}
			return &http.Response{
				StatusCode: http.StatusOK,
				Body:       io.NopCloser(bytes.NewBufferString(`{"MessageID":"msg_test"}`)),
				Header:     make(http.Header),
			}, nil
		}),
	}

	err := SendEmail("Quota warning", "first@example.com; second@example.com", "<p>Quota low</p>")
	if err != nil {
		t.Fatalf("SendEmail returned error: %v", err)
	}

	if gotPath != "/email" {
		t.Fatalf("path = %q, want /email", gotPath)
	}
	if gotToken != "server-token" {
		t.Fatalf("token = %q", gotToken)
	}
	if gotPayload.From != "Flintbase <sender@example.com>" {
		t.Fatalf("from = %q", gotPayload.From)
	}
	if gotPayload.To != "first@example.com,second@example.com" {
		t.Fatalf("to = %q", gotPayload.To)
	}
	if gotPayload.Subject != "Quota warning" {
		t.Fatalf("subject = %q", gotPayload.Subject)
	}
	if gotPayload.HtmlBody != "<p>Quota low</p>" {
		t.Fatalf("html body = %q", gotPayload.HtmlBody)
	}
	if gotPayload.MessageStream != "broadcast" {
		t.Fatalf("message stream = %q", gotPayload.MessageStream)
	}
}

func TestSendEmailRequiresPostmarkTokenAndSender(t *testing.T) {
	resetPostmarkSettings(t)

	PostmarkServerToken = ""
	PostmarkFrom = "sender@example.com"
	if err := SendEmail("subject", "user@example.com", "<p>content</p>"); err == nil {
		t.Fatal("SendEmail should fail when PostmarkServerToken is empty")
	}

	PostmarkServerToken = "server-token"
	PostmarkFrom = ""
	if err := SendEmail("subject", "user@example.com", "<p>content</p>"); err == nil {
		t.Fatal("SendEmail should fail when PostmarkFrom is empty")
	}
}

func TestPostmarkRecipientsRejectsEmptyReceiver(t *testing.T) {
	if _, err := postmarkRecipients(" ; , "); err == nil {
		t.Fatal("postmarkRecipients should reject empty receiver list")
	}
}
