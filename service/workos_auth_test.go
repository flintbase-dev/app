package service

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
)

func TestWorkOSAuthorizationURLUsesHostedUIAuthKit(t *testing.T) {
	cfg := WorkOSConfig{
		APIBaseURL:  "https://api.workos.test",
		ClientID:    "client_test",
		RedirectURI: "https://app.example.com/api/workos/callback",
	}

	authURL, err := WorkOSAuthorizationURL(cfg, WorkOSAuthorizeOptions{
		State:      "state_test",
		ScreenHint: "sign-up",
		Prompt:     "login",
	})
	if err != nil {
		t.Fatalf("WorkOSAuthorizationURL returned error: %v", err)
	}

	parsed, err := url.Parse(authURL)
	if err != nil {
		t.Fatalf("failed to parse auth URL: %v", err)
	}
	if parsed.String() == "" {
		t.Fatal("auth URL is empty")
	}
	if parsed.Scheme != "https" || parsed.Host != "api.workos.test" || parsed.Path != workOSAuthorizePath {
		t.Fatalf("unexpected authorize endpoint: %s", parsed.String())
	}

	query := parsed.Query()
	assertQueryValue(t, query, "client_id", cfg.ClientID)
	assertQueryValue(t, query, "redirect_uri", cfg.RedirectURI)
	assertQueryValue(t, query, "response_type", "code")
	assertQueryValue(t, query, "provider", "authkit")
	assertQueryValue(t, query, "state", "state_test")
	assertQueryValue(t, query, "screen_hint", "sign-up")
	assertQueryValue(t, query, "prompt", "login")
}

func TestWorkOSConfigFromRequestRequiresSecretsAndBuildsDefaultRedirectURI(t *testing.T) {
	t.Setenv("WORKOS_API_BASE_URL", "")
	t.Setenv("WORKOS_API_KEY", "sk_test")
	t.Setenv("WORKOS_CLIENT_ID", "client_test")
	t.Setenv("WORKOS_REDIRECT_URI", "")

	req := httptest.NewRequest("GET", "https://app.example.com/api/workos/login", nil)
	cfg, err := WorkOSConfigFromRequest(req)
	if err != nil {
		t.Fatalf("WorkOSConfigFromRequest returned error: %v", err)
	}
	if cfg.RedirectURI != "https://app.example.com/api/workos/callback" {
		t.Fatalf("unexpected redirect URI: %q", cfg.RedirectURI)
	}
	if cfg.APIBaseURL != defaultWorkOSAPIBaseURL {
		t.Fatalf("unexpected API base URL: %q", cfg.APIBaseURL)
	}
}

func TestWorkOSConfigFromRequestRejectsMissingClientID(t *testing.T) {
	t.Setenv("WORKOS_API_KEY", "sk_test")
	t.Setenv("WORKOS_CLIENT_ID", "")
	t.Setenv("WORKOS_REDIRECT_URI", "https://app.example.com/api/workos/callback")

	_, err := WorkOSConfigFromRequest(nil)
	if err == nil || !strings.Contains(err.Error(), "WORKOS_CLIENT_ID") {
		t.Fatalf("expected WORKOS_CLIENT_ID error, got %v", err)
	}
}

func TestAuthenticateWorkOSCodePostsAuthorizationCodeGrant(t *testing.T) {
	requestSeen := false
	originalClient := http.DefaultClient
	http.DefaultClient = &http.Client{Transport: roundTripFunc(func(r *http.Request) (*http.Response, error) {
		requestSeen = true
		if r.Method != http.MethodPost {
			t.Fatalf("method = %s, want POST", r.Method)
		}
		if r.URL.Path != workOSAuthenticatePath {
			t.Fatalf("path = %s, want %s", r.URL.Path, workOSAuthenticatePath)
		}
		if got := r.Header.Get("Authorization"); got != "Bearer sk_test" {
			t.Fatalf("Authorization header = %q", got)
		}
		if got := r.Header.Get("Content-Type"); got != "application/json" {
			t.Fatalf("Content-Type = %q", got)
		}

		var payload map[string]string
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			t.Fatalf("failed to decode request body: %v", err)
		}
		if payload["client_id"] != "client_test" {
			t.Fatalf("client_id = %q", payload["client_id"])
		}
		if payload["client_secret"] != "sk_test" {
			t.Fatalf("client_secret = %q", payload["client_secret"])
		}
		if payload["grant_type"] != "authorization_code" {
			t.Fatalf("grant_type = %q", payload["grant_type"])
		}
		if payload["code"] != "code_test" {
			t.Fatalf("code = %q", payload["code"])
		}

		return &http.Response{
			StatusCode: http.StatusOK,
			Header:     http.Header{"Content-Type": []string{"application/json"}},
			Body: io.NopCloser(strings.NewReader(`{
			"user": {
				"id": "user_123",
				"email": "user@example.com",
				"first_name": "Work",
				"last_name": "OS",
				"email_verified": true,
				"profile_picture_url": "https://example.com/avatar.png"
			},
			"organization_id": "org_123",
			"authentication_method": "SSO",
			"access_token": "access_token_test",
			"refresh_token": "refresh_token_test"
		}`)),
		}, nil
	})}
	t.Cleanup(func() {
		http.DefaultClient = originalClient
	})

	resp, err := AuthenticateWorkOSCode(context.Background(), WorkOSConfig{
		APIBaseURL: "https://api.workos.test",
		APIKey:     "sk_test",
		ClientID:   "client_test",
	}, "code_test")
	if err != nil {
		t.Fatalf("AuthenticateWorkOSCode returned error: %v", err)
	}
	if !requestSeen {
		t.Fatal("authenticate endpoint was not called")
	}
	if resp.User.ID != "user_123" {
		t.Fatalf("user id = %q", resp.User.ID)
	}
	if resp.User.Email != "user@example.com" {
		t.Fatalf("email = %q", resp.User.Email)
	}
	if resp.OrganizationID != "org_123" {
		t.Fatalf("organization id = %q", resp.OrganizationID)
	}
	if resp.AuthenticationMethod != "SSO" {
		t.Fatalf("authentication method = %q", resp.AuthenticationMethod)
	}
	if resp.AccessToken != "access_token_test" {
		t.Fatalf("access token = %q", resp.AccessToken)
	}
	if resp.RefreshToken != "refresh_token_test" {
		t.Fatalf("refresh token = %q", resp.RefreshToken)
	}
}

func TestAuthenticateWorkOSCodeRejectsEmptyCode(t *testing.T) {
	_, err := AuthenticateWorkOSCode(context.Background(), WorkOSConfig{}, " ")
	if err == nil || !strings.Contains(err.Error(), "authorization code") {
		t.Fatalf("expected authorization code error, got %v", err)
	}
}

type roundTripFunc func(*http.Request) (*http.Response, error)

func (fn roundTripFunc) RoundTrip(r *http.Request) (*http.Response, error) {
	return fn(r)
}

func TestWorkOSLogoutURL(t *testing.T) {
	cfg := WorkOSConfig{APIBaseURL: "https://api.workos.test"}
	logoutURL := WorkOSLogoutURL(cfg, "session_test", "https://app.example.com/login")

	parsed, err := url.Parse(logoutURL)
	if err != nil {
		t.Fatalf("failed to parse logout URL: %v", err)
	}
	if parsed.Path != workOSLogoutPath {
		t.Fatalf("unexpected logout path: %s", parsed.Path)
	}
	query := parsed.Query()
	assertQueryValue(t, query, "session_id", "session_test")
	assertQueryValue(t, query, "return_to", "https://app.example.com/login")
}

func TestWorkOSSessionIDFromAccessToken(t *testing.T) {
	token := "eyJhbGciOiJub25lIn0.eyJzaWQiOiJzZXNzXzEyMyJ9."
	if got := WorkOSSessionIDFromAccessToken(token); got != "sess_123" {
		t.Fatalf("expected session id from access token, got %q", got)
	}
}

func assertQueryValue(t *testing.T, query url.Values, key string, want string) {
	t.Helper()
	if got := query.Get(key); got != want {
		t.Fatalf("query %s = %q, want %q", key, got, want)
	}
}
