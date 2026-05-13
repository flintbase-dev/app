package service

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"testing"
	"time"
)

func TestParseWorkOSWebhookEventVerifiesSignature(t *testing.T) {
	payload := []byte(`{"event":"organization.updated","data":{"id":"org_123","name":"Acme"}}`)
	secret := "whsec_test"
	timestamp := time.Now().UnixMilli()
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(fmt.Sprintf("%d", timestamp)))
	mac.Write([]byte("."))
	mac.Write(payload)
	signature := hex.EncodeToString(mac.Sum(nil))

	event, err := ParseWorkOSWebhookEvent(payload, fmt.Sprintf("t=%d,v1=%s", timestamp, signature), secret)
	if err != nil {
		t.Fatalf("ParseWorkOSWebhookEvent returned error: %v", err)
	}
	if event.Type != "organization.updated" {
		t.Fatalf("event type = %q, want organization.updated", event.Type)
	}

	if _, err := ParseWorkOSWebhookEvent(payload, fmt.Sprintf("t=%d,v1=bad", timestamp), secret); err == nil {
		t.Fatalf("bad WorkOS webhook signature should be rejected")
	}
}

func TestWorkOSOrganizationPayloadHelpersAcceptSnakeAndCamelCase(t *testing.T) {
	membership := WorkOSOrganizationMembership{
		ID:             "om_123",
		UserId:         "user_camel",
		OrganizationId: "org_camel",
		Roles:          []WorkOSRole{{Slug: "admin"}},
	}
	if membership.User() != "user_camel" {
		t.Fatalf("membership user = %q, want user_camel", membership.User())
	}
	if membership.Organization() != "org_camel" {
		t.Fatalf("membership organization = %q, want org_camel", membership.Organization())
	}
	if membership.RoleSlug() != "admin" {
		t.Fatalf("membership role = %q, want admin", membership.RoleSlug())
	}

	invitation := WorkOSInvitation{
		ID:             "inv_123",
		OrganizationId: "org_camel",
		ExpiresAtCamel: "2026-01-02T03:04:05Z",
	}
	if invitation.Organization() != "org_camel" {
		t.Fatalf("invitation organization = %q, want org_camel", invitation.Organization())
	}
	if invitation.ExpiryTimestamp() == 0 {
		t.Fatalf("invitation expiry should parse camel-case timestamp")
	}
}
