package controller

import (
	"testing"

	"github.com/QuantumNous/new-api/setting"
	"github.com/stripe/stripe-go/v85"
)

func TestStripeSDKUsesProjectAPIVersion(t *testing.T) {
	if stripe.APIVersion != setting.StripeAPIVersion {
		t.Fatalf("stripe API version = %q, want %q", stripe.APIVersion, setting.StripeAPIVersion)
	}
}

func TestConfigureStripeClientUsesProjectKey(t *testing.T) {
	previousKey := stripe.Key
	previousSecret := setting.StripeApiSecret
	defer func() {
		stripe.Key = previousKey
		setting.StripeApiSecret = previousSecret
	}()

	setting.StripeApiSecret = "sk_test_project_version"
	stripe.Key = ""

	configureStripeClient()

	if stripe.Key != setting.StripeApiSecret {
		t.Fatalf("stripe key was not configured")
	}
}
