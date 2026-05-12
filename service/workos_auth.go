package service

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

const (
	defaultWorkOSAPIBaseURL = "https://api.workos.com"
	workOSAuthorizePath     = "/user_management/authorize"
	workOSAuthenticatePath  = "/user_management/authenticate"
	workOSLogoutPath        = "/user_management/sessions/logout"
)

type WorkOSConfig struct {
	APIBaseURL  string
	APIKey      string
	ClientID    string
	RedirectURI string
}

type WorkOSAuthorizeOptions struct {
	State      string
	ScreenHint string
	Prompt     string
}

type WorkOSUser struct {
	ID                string `json:"id"`
	Email             string `json:"email"`
	FirstName         string `json:"first_name"`
	LastName          string `json:"last_name"`
	EmailVerified     bool   `json:"email_verified"`
	ProfilePictureURL string `json:"profile_picture_url"`
}

type WorkOSAuthenticationResponse struct {
	User                 WorkOSUser `json:"user"`
	OrganizationID       string     `json:"organization_id"`
	AccessToken          string     `json:"access_token"`
	RefreshToken         string     `json:"refresh_token"`
	AuthenticationMethod string     `json:"authentication_method"`
}

func NewWorkOSState() (string, error) {
	var raw [32]byte
	if _, err := rand.Read(raw[:]); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(raw[:]), nil
}

func WorkOSConfigFromRequest(r *http.Request) (WorkOSConfig, error) {
	cfg := WorkOSConfig{
		APIBaseURL:  strings.TrimRight(envOrDefault("WORKOS_API_BASE_URL", defaultWorkOSAPIBaseURL), "/"),
		APIKey:      strings.TrimSpace(os.Getenv("WORKOS_API_KEY")),
		ClientID:    strings.TrimSpace(os.Getenv("WORKOS_CLIENT_ID")),
		RedirectURI: strings.TrimSpace(os.Getenv("WORKOS_REDIRECT_URI")),
	}
	if cfg.RedirectURI == "" && r != nil {
		cfg.RedirectURI = requestOrigin(r) + "/api/workos/callback"
	}
	if cfg.APIKey == "" {
		return cfg, errors.New("WORKOS_API_KEY is required")
	}
	if cfg.ClientID == "" {
		return cfg, errors.New("WORKOS_CLIENT_ID is required")
	}
	if cfg.RedirectURI == "" {
		return cfg, errors.New("WORKOS_REDIRECT_URI is required")
	}
	return cfg, nil
}

func WorkOSAuthorizationURL(cfg WorkOSConfig, opts WorkOSAuthorizeOptions) (string, error) {
	u, err := url.Parse(cfg.APIBaseURL + workOSAuthorizePath)
	if err != nil {
		return "", err
	}
	q := u.Query()
	q.Set("client_id", cfg.ClientID)
	q.Set("redirect_uri", cfg.RedirectURI)
	q.Set("response_type", "code")
	q.Set("provider", "authkit")
	q.Set("state", opts.State)
	if opts.ScreenHint != "" {
		q.Set("screen_hint", opts.ScreenHint)
	}
	if opts.Prompt != "" {
		q.Set("prompt", opts.Prompt)
	}
	u.RawQuery = q.Encode()
	return u.String(), nil
}

func AuthenticateWorkOSCode(ctx context.Context, cfg WorkOSConfig, code string) (*WorkOSAuthenticationResponse, error) {
	if strings.TrimSpace(code) == "" {
		return nil, errors.New("authorization code is required")
	}

	payload := map[string]string{
		"client_id":     cfg.ClientID,
		"client_secret": cfg.APIKey,
		"grant_type":    "authorization_code",
		"code":          code,
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}

	ctx, cancel := context.WithTimeout(ctx, 15*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, cfg.APIBaseURL+workOSAuthenticatePath, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Authorization", "Bearer "+cfg.APIKey)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return nil, err
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("workos authenticate failed: status=%d message=%s", resp.StatusCode, workOSErrorMessage(respBody))
	}

	var authResp WorkOSAuthenticationResponse
	if err := json.Unmarshal(respBody, &authResp); err != nil {
		return nil, err
	}
	if strings.TrimSpace(authResp.User.ID) == "" {
		return nil, errors.New("workos authenticate response missing user id")
	}
	return &authResp, nil
}

func WorkOSLogoutURL(cfg WorkOSConfig, sessionID string, returnTo string) string {
	if strings.TrimSpace(sessionID) == "" {
		return returnTo
	}
	u, err := url.Parse(cfg.APIBaseURL + workOSLogoutPath)
	if err != nil {
		return returnTo
	}
	q := u.Query()
	q.Set("session_id", sessionID)
	if returnTo != "" {
		q.Set("return_to", returnTo)
	}
	u.RawQuery = q.Encode()
	return u.String()
}

func WorkOSSessionIDFromAccessToken(accessToken string) string {
	if strings.TrimSpace(accessToken) == "" {
		return ""
	}
	claims := jwt.MapClaims{}
	parser := jwt.NewParser()
	if _, _, err := parser.ParseUnverified(accessToken, claims); err != nil {
		return ""
	}
	if sid, ok := claims["sid"].(string); ok {
		return sid
	}
	return ""
}

func requestOrigin(r *http.Request) string {
	proto := strings.TrimSpace(r.Header.Get("X-Forwarded-Proto"))
	if proto == "" {
		if r.TLS != nil {
			proto = "https"
		} else {
			proto = "http"
		}
	}
	host := strings.TrimSpace(r.Header.Get("X-Forwarded-Host"))
	if host == "" {
		host = r.Host
	}
	return proto + "://" + host
}

func envOrDefault(key string, fallback string) string {
	if value := strings.TrimSpace(os.Getenv(key)); value != "" {
		return value
	}
	return fallback
}

func workOSErrorMessage(body []byte) string {
	var payload struct {
		Error            string `json:"error"`
		ErrorDescription string `json:"error_description"`
		Message          string `json:"message"`
	}
	if err := json.Unmarshal(body, &payload); err == nil {
		for _, value := range []string{payload.ErrorDescription, payload.Message, payload.Error} {
			if strings.TrimSpace(value) != "" {
				return value
			}
		}
	}
	return strings.TrimSpace(string(body))
}
