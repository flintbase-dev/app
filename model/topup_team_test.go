package model

import (
	"testing"

	"github.com/QuantumNous/new-api/common"
)

func TestCompleteStripeInvoiceTopUpCreditsTeamWalletIdempotently(t *testing.T) {
	db := setupTeamModelTestDB(t)
	user := seedTeamTestUser(t, db, "user_team_billing", "billing@example.com", "workos_billing")
	team, err := CreateTeamWithCreator(CreateTeamParams{
		Name:                 "Billing Team",
		CreatedByUserId:      user.Id,
		WorkOSOrganizationId: "org_billing",
		WorkOSMembershipId:   "om_billing",
	})
	if err != nil {
		t.Fatalf("CreateTeamWithCreator returned error: %v", err)
	}

	params := StripeInvoiceTopUpParams{
		UserId:          user.Id,
		AccountType:     AccountTypeTeam,
		AccountId:       team.Id,
		InvoiceId:       "in_team_1",
		StripeInvoiceId: "in_team_1",
		CustomerId:      "cus_team_1",
		PaymentMethod:   PaymentMethodStripe,
		CreditUnits:     10,
		TopUpUnits:      10,
		PaidAmount:      10,
		Currency:        "usd",
	}
	created, err := CompleteStripeInvoiceTopUp(params)
	if err != nil {
		t.Fatalf("CompleteStripeInvoiceTopUp returned error: %v", err)
	}
	if !created {
		t.Fatalf("first fulfillment should be created")
	}
	created, err = CompleteStripeInvoiceTopUp(params)
	if err != nil {
		t.Fatalf("second CompleteStripeInvoiceTopUp returned error: %v", err)
	}
	if created {
		t.Fatalf("second fulfillment should be idempotent")
	}
	updated, err := GetTeamById(team.Id)
	if err != nil {
		t.Fatalf("GetTeamById returned error: %v", err)
	}
	wantQuota := int(10 * common.SiteCreditsPerPriceUnit)
	if updated.Quota != wantQuota {
		t.Fatalf("team quota = %d, want %d", updated.Quota, wantQuota)
	}
	if updated.StripeCustomer != "cus_team_1" {
		t.Fatalf("team stripe customer = %q, want cus_team_1", updated.StripeCustomer)
	}
}
