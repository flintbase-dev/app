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

func TestCompleteStripeInvoiceTopUpRejectsPaymentOrderAccountMismatch(t *testing.T) {
	db := setupTeamModelTestDB(t)
	user := seedTeamTestUser(t, db, "user_team_billing_mismatch", "billing-mismatch@example.com", "workos_billing_mismatch")
	firstTeam, err := CreateTeamWithCreator(CreateTeamParams{
		Name:                 "Billing Source Team",
		CreatedByUserId:      user.Id,
		WorkOSOrganizationId: "org_billing_source",
		WorkOSMembershipId:   "om_billing_source",
	})
	if err != nil {
		t.Fatalf("CreateTeamWithCreator source returned error: %v", err)
	}
	secondTeam, err := CreateTeamWithCreator(CreateTeamParams{
		Name:                 "Billing Metadata Team",
		CreatedByUserId:      user.Id,
		WorkOSOrganizationId: "org_billing_metadata",
		WorkOSMembershipId:   "om_billing_metadata",
	})
	if err != nil {
		t.Fatalf("CreateTeamWithCreator metadata returned error: %v", err)
	}
	order, err := CreatePendingStripePaymentOrder(CreatePendingStripePaymentOrderParams{
		UserId:          user.Id,
		AccountType:     AccountTypeTeam,
		AccountId:       firstTeam.Id,
		Kind:            StripePaymentOrderKindTopup,
		BusinessOrderId: "checkout_mismatch",
		AmountCents:     1000,
		DisplayAmount:   10,
		Currency:        "usd",
		CreditUnits:     10,
		TopUpUnits:      10,
		PaymentMethod:   PaymentMethodStripe,
		PaymentProvider: PaymentProviderStripe,
	})
	if err != nil {
		t.Fatalf("CreatePendingStripePaymentOrder returned error: %v", err)
	}

	created, err := CompleteStripeInvoiceTopUp(StripeInvoiceTopUpParams{
		PaymentOrderId:  order.Id,
		UserId:          user.Id,
		AccountType:     AccountTypeTeam,
		AccountId:       secondTeam.Id,
		InvoiceId:       "in_mismatch",
		StripeInvoiceId: "in_mismatch",
		CustomerId:      "cus_mismatch",
		PaymentMethod:   PaymentMethodStripe,
		CreditUnits:     10,
		TopUpUnits:      10,
		PaidAmount:      10,
		Currency:        "usd",
	})
	if err == nil {
		t.Fatalf("expected payment order account mismatch to fail")
	}
	if created {
		t.Fatalf("mismatched payment order should not create fulfillment")
	}
	var reloaded StripePaymentOrder
	if err := db.First(&reloaded, "id = ?", order.Id).Error; err != nil {
		t.Fatalf("failed to reload payment order: %v", err)
	}
	if reloaded.Status != common.TopUpStatusPending {
		t.Fatalf("payment order status = %q, want pending after mismatch", reloaded.Status)
	}
	updated, err := GetTeamById(secondTeam.Id)
	if err != nil {
		t.Fatalf("GetTeamById returned error: %v", err)
	}
	if updated.Quota != 0 {
		t.Fatalf("metadata team quota = %d, want 0 after mismatch", updated.Quota)
	}
}
