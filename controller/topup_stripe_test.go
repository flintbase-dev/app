package controller

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/gin-gonic/gin"
	"github.com/stripe/stripe-go/v85"
)

func TestStripeInvoiceRecordFromInvoiceUsesCreditUnits(t *testing.T) {
	inv := &stripe.Invoice{
		ID:         "in_test",
		AmountDue:  9000,
		AmountPaid: 9000,
		Currency:   stripe.CurrencyUSD,
		Created:    123,
		Metadata: map[string]string{
			stripeMetadataKindKey:        stripeInvoiceKindTopup,
			stripeMetadataTopupUnitsKey:  "100",
			stripeMetadataCreditUnitsKey: "150.5",
		},
		Number: "INV-1",
		Status: stripe.InvoiceStatusPaid,
	}

	record := stripeInvoiceRecordFromInvoice(inv)
	if record.Amount != 150.5 {
		t.Fatalf("amount = %v, want 150.5", record.Amount)
	}
	if record.CreditUnits != 150.5 {
		t.Fatalf("credit_units = %v, want 150.5", record.CreditUnits)
	}
	if record.TopUpUnits != 100 {
		t.Fatalf("topup_units = %d, want 100", record.TopUpUnits)
	}
	if record.Money != 90 {
		t.Fatalf("money = %v, want 90", record.Money)
	}
}

func TestRenderStripeCheckoutTextUsesConfiguredTemplate(t *testing.T) {
	user := &model.User{
		Id:       "user_test",
		Username: "tester",
		Email:    "tester@example.com",
	}
	input := stripeCheckoutPaymentInput{
		User:                   user,
		DisplayAmount:          88,
		CreditUnits:            150,
		TopUpUnits:             100,
		Currency:               "cny",
		Description:            "Wallet top up 100",
		InvoiceItemDescription: "Wallet credits: 100 units",
	}
	metadata := map[string]string{
		stripeMetadataKindKey:           stripeInvoiceKindTopup,
		stripeMetadataPaymentOrderIDKey: "spo_test",
	}

	got := renderStripeCheckoutText(
		"{line_item} / {credit_units} / {currency} / {username} / {payment_order_id}",
		"fallback",
		input,
		metadata,
	)
	want := "Wallet credits: 100 units / 150 / CNY / tester / spo_test"
	if got != want {
		t.Fatalf("rendered text = %q, want %q", got, want)
	}
}

func TestTeamIdFromStripeRequestPrefersBodyThenRouteThenQuery(t *testing.T) {
	prevGinMode := gin.Mode()
	t.Cleanup(func() {
		gin.SetMode(prevGinMode)
	})
	gin.SetMode(gin.TestMode)

	ctx, _ := gin.CreateTestContext(httptest.NewRecorder())
	ctx.Request = httptest.NewRequest(http.MethodPost, "/?team_id=team_query", nil)
	ctx.Params = gin.Params{{Key: "team_id", Value: "team_route"}}
	if got := teamIdFromStripeRequest(ctx, "team_body"); got != "team_body" {
		t.Fatalf("team id = %q, want body team id", got)
	}
	if got := teamIdFromStripeRequest(ctx, ""); got != "team_route" {
		t.Fatalf("team id = %q, want route team id", got)
	}

	ctx.Params = nil
	if got := teamIdFromStripeRequest(ctx, ""); got != "team_query" {
		t.Fatalf("team id = %q, want query team id", got)
	}
}

func TestStripeCheckoutSessionResolvedStatusFailedReturn(t *testing.T) {
	session := &stripe.CheckoutSession{
		ID:            "cs_test",
		Status:        stripe.CheckoutSessionStatusComplete,
		PaymentStatus: stripe.CheckoutSessionPaymentStatusUnpaid,
		PaymentIntent: &stripe.PaymentIntent{
			Status: stripe.PaymentIntentStatusRequiresPaymentMethod,
		},
	}

	if got := stripeCheckoutSessionResolvedStatus(session); got != common.TopUpStatusFailed {
		t.Fatalf("status = %q, want %q", got, common.TopUpStatusFailed)
	}
}
