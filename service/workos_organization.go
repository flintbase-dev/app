package service

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"
)

const (
	workOSOrganizationsPath           = "/organizations"
	workOSOrganizationMembershipsPath = "/user_management/organization_memberships"
	workOSInvitationsPath             = "/user_management/invitations"
	defaultWorkOSWebhookTolerance     = 5 * time.Minute
)

type WorkOSOrganization struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type WorkOSRole struct {
	Slug string `json:"slug"`
}

type WorkOSOrganizationMembership struct {
	ID             string       `json:"id"`
	UserID         string       `json:"user_id"`
	UserId         string       `json:"userId"`
	OrganizationID string       `json:"organization_id"`
	OrganizationId string       `json:"organizationId"`
	Status         string       `json:"status"`
	Role           WorkOSRole   `json:"role"`
	Roles          []WorkOSRole `json:"roles"`
}

type WorkOSInvitation struct {
	ID             string `json:"id"`
	Email          string `json:"email"`
	State          string `json:"state"`
	OrganizationID string `json:"organization_id"`
	OrganizationId string `json:"organizationId"`
	ExpiresAt      string `json:"expires_at"`
	ExpiresAtCamel string `json:"expiresAt"`
}

type WorkOSAPIError struct {
	Method     string
	Path       string
	StatusCode int
	Message    string
}

func (e *WorkOSAPIError) Error() string {
	return fmt.Sprintf("workos api failed: method=%s path=%s status=%d message=%s", e.Method, e.Path, e.StatusCode, e.Message)
}

type WorkOSWebhookEvent struct {
	ID    string          `json:"id"`
	Type  string          `json:"event"`
	Event string          `json:"type"`
	Data  json.RawMessage `json:"data"`
}

func workOSWebhookSecret() string {
	return strings.TrimSpace(os.Getenv("WORKOS_WEBHOOK_SECRET"))
}

func WorkOSWebhookSecret() string {
	return workOSWebhookSecret()
}

func workOSAPIRequest(ctx context.Context, cfg WorkOSConfig, method string, path string, payload interface{}, out interface{}) error {
	var body io.Reader
	if payload != nil {
		buf, err := json.Marshal(payload)
		if err != nil {
			return err
		}
		body = bytes.NewReader(buf)
	}
	ctx, cancel := context.WithTimeout(ctx, 15*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, method, cfg.APIBaseURL+path, body)
	if err != nil {
		return err
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Authorization", "Bearer "+cfg.APIKey)
	if payload != nil {
		req.Header.Set("Content-Type", "application/json")
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	respBody, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return err
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return &WorkOSAPIError{
			Method:     method,
			Path:       path,
			StatusCode: resp.StatusCode,
			Message:    workOSErrorMessage(respBody),
		}
	}
	if out != nil && len(respBody) > 0 {
		if err := json.Unmarshal(respBody, out); err != nil {
			return err
		}
	}
	return nil
}

func CreateWorkOSOrganization(ctx context.Context, cfg WorkOSConfig, name string, externalId string) (*WorkOSOrganization, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return nil, errors.New("organization name is required")
	}
	payload := map[string]interface{}{
		"name": name,
		"metadata": map[string]string{
			"source": "flintbase_team",
		},
	}
	if externalId != "" {
		payload["external_id"] = externalId
	}
	var organization WorkOSOrganization
	if err := workOSAPIRequest(ctx, cfg, http.MethodPost, workOSOrganizationsPath, payload, &organization); err != nil {
		return nil, err
	}
	if strings.TrimSpace(organization.ID) == "" {
		return nil, errors.New("workos organization response missing id")
	}
	return &organization, nil
}

func DeleteWorkOSOrganization(ctx context.Context, cfg WorkOSConfig, organizationID string) error {
	err := workOSAPIRequest(ctx, cfg, http.MethodDelete, workOSOrganizationsPath+"/"+strings.TrimSpace(organizationID), nil, nil)
	var apiErr *WorkOSAPIError
	if errors.As(err, &apiErr) && apiErr.StatusCode == http.StatusNotFound {
		return nil
	}
	return err
}

func UpdateWorkOSOrganization(ctx context.Context, cfg WorkOSConfig, organizationID string, name string) (*WorkOSOrganization, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return nil, errors.New("organization name is required")
	}
	payload := map[string]interface{}{
		"name": name,
		"metadata": map[string]string{
			"source": "flintbase_team",
		},
	}
	var organization WorkOSOrganization
	if err := workOSAPIRequest(ctx, cfg, http.MethodPut, workOSOrganizationsPath+"/"+strings.TrimSpace(organizationID), payload, &organization); err != nil {
		return nil, err
	}
	if strings.TrimSpace(organization.ID) == "" {
		return nil, errors.New("workos organization response missing id")
	}
	return &organization, nil
}

func CreateWorkOSOrganizationMembership(ctx context.Context, cfg WorkOSConfig, organizationID string, userID string, role string) (*WorkOSOrganizationMembership, error) {
	payload := map[string]interface{}{
		"organization_id": strings.TrimSpace(organizationID),
		"user_id":         strings.TrimSpace(userID),
		"role_slug":       strings.TrimSpace(role),
	}
	var membership WorkOSOrganizationMembership
	if err := workOSAPIRequest(ctx, cfg, http.MethodPost, workOSOrganizationMembershipsPath, payload, &membership); err != nil {
		return nil, err
	}
	if strings.TrimSpace(membership.ID) == "" {
		return nil, errors.New("workos membership response missing id")
	}
	return &membership, nil
}

func UpdateWorkOSOrganizationMembershipRole(ctx context.Context, cfg WorkOSConfig, membershipID string, role string) error {
	payload := map[string]interface{}{
		"role_slug": strings.TrimSpace(role),
	}
	var membership WorkOSOrganizationMembership
	return workOSAPIRequest(ctx, cfg, http.MethodPut, workOSOrganizationMembershipsPath+"/"+strings.TrimSpace(membershipID), payload, &membership)
}

func DeactivateWorkOSOrganizationMembership(ctx context.Context, cfg WorkOSConfig, membershipID string) error {
	var membership WorkOSOrganizationMembership
	return workOSAPIRequest(ctx, cfg, http.MethodPut, workOSOrganizationMembershipsPath+"/"+strings.TrimSpace(membershipID)+"/deactivate", nil, &membership)
}

func ListWorkOSOrganizationMemberships(ctx context.Context, cfg WorkOSConfig, organizationID string, userID string) ([]WorkOSOrganizationMembership, error) {
	values := url.Values{}
	if organizationID != "" {
		values.Set("organization_id", organizationID)
	}
	if userID != "" {
		values.Set("user_id", userID)
	}
	values.Set("statuses[]", "active")
	values.Add("statuses[]", "pending")
	values.Add("statuses[]", "inactive")
	path := workOSOrganizationMembershipsPath
	if encoded := values.Encode(); encoded != "" {
		path += "?" + encoded
	}
	var response struct {
		Data []WorkOSOrganizationMembership `json:"data"`
	}
	if err := workOSAPIRequest(ctx, cfg, http.MethodGet, path, nil, &response); err != nil {
		return nil, err
	}
	return response.Data, nil
}

func SendWorkOSOrganizationInvitation(ctx context.Context, cfg WorkOSConfig, organizationID string, email string, role string, inviterWorkOSUserID string) (*WorkOSInvitation, error) {
	payload := map[string]interface{}{
		"email":           strings.ToLower(strings.TrimSpace(email)),
		"organization_id": strings.TrimSpace(organizationID),
		"role_slug":       strings.TrimSpace(role),
	}
	if strings.TrimSpace(inviterWorkOSUserID) != "" {
		payload["inviter_user_id"] = strings.TrimSpace(inviterWorkOSUserID)
	}
	var invitation WorkOSInvitation
	if err := workOSAPIRequest(ctx, cfg, http.MethodPost, workOSInvitationsPath, payload, &invitation); err != nil {
		return nil, err
	}
	if strings.TrimSpace(invitation.ID) == "" {
		return nil, errors.New("workos invitation response missing id")
	}
	return &invitation, nil
}

func RevokeWorkOSInvitation(ctx context.Context, cfg WorkOSConfig, invitationID string) error {
	var invitation WorkOSInvitation
	return workOSAPIRequest(ctx, cfg, http.MethodPost, workOSInvitationsPath+"/"+strings.TrimSpace(invitationID)+"/revoke", nil, &invitation)
}

func (membership WorkOSOrganizationMembership) Organization() string {
	if membership.OrganizationID != "" {
		return membership.OrganizationID
	}
	return membership.OrganizationId
}

func (membership WorkOSOrganizationMembership) User() string {
	if membership.UserID != "" {
		return membership.UserID
	}
	return membership.UserId
}

func (membership WorkOSOrganizationMembership) RoleSlug() string {
	if membership.Role.Slug != "" {
		return membership.Role.Slug
	}
	if len(membership.Roles) > 0 {
		return membership.Roles[0].Slug
	}
	return "member"
}

func (invitation WorkOSInvitation) Organization() string {
	if invitation.OrganizationID != "" {
		return invitation.OrganizationID
	}
	return invitation.OrganizationId
}

func (invitation WorkOSInvitation) ExpiryTimestamp() int64 {
	value := invitation.ExpiresAt
	if value == "" {
		value = invitation.ExpiresAtCamel
	}
	if value == "" {
		return 0
	}
	parsed, err := time.Parse(time.RFC3339Nano, value)
	if err != nil {
		return 0
	}
	return parsed.Unix()
}

func ParseWorkOSWebhookEvent(payload []byte, signatureHeader string, secret string) (*WorkOSWebhookEvent, error) {
	if strings.TrimSpace(secret) == "" {
		return nil, errors.New("WORKOS_WEBHOOK_SECRET is required")
	}
	if err := verifyWorkOSWebhookSignature(payload, signatureHeader, secret, defaultWorkOSWebhookTolerance); err != nil {
		return nil, err
	}
	var event WorkOSWebhookEvent
	if err := json.Unmarshal(payload, &event); err != nil {
		return nil, err
	}
	if event.Type == "" {
		event.Type = event.Event
	}
	if event.Type == "" {
		return nil, errors.New("workos webhook event type is required")
	}
	return &event, nil
}

func verifyWorkOSWebhookSignature(payload []byte, signatureHeader string, secret string, tolerance time.Duration) error {
	parts := strings.Split(signatureHeader, ",")
	var timestamp string
	var signature string
	for _, part := range parts {
		keyValue := strings.SplitN(strings.TrimSpace(part), "=", 2)
		if len(keyValue) != 2 {
			continue
		}
		switch keyValue[0] {
		case "t":
			timestamp = keyValue[1]
		case "v1":
			signature = keyValue[1]
		}
	}
	if timestamp == "" || signature == "" {
		return errors.New("invalid WorkOS-Signature header")
	}
	issuedMs, err := strconv.ParseInt(timestamp, 10, 64)
	if err != nil {
		return errors.New("invalid WorkOS webhook timestamp")
	}
	issuedAt := time.UnixMilli(issuedMs)
	if tolerance > 0 {
		now := time.Now()
		if issuedAt.Before(now.Add(-tolerance)) || issuedAt.After(now.Add(tolerance)) {
			return errors.New("WorkOS webhook timestamp outside tolerance")
		}
	}
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(timestamp))
	mac.Write([]byte("."))
	mac.Write(payload)
	expected := hex.EncodeToString(mac.Sum(nil))
	if !hmac.Equal([]byte(expected), []byte(signature)) {
		return errors.New("invalid WorkOS webhook signature")
	}
	return nil
}
