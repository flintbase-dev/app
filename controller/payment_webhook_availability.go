package controller

func isStripeTopUpEnabled() bool {
	return validateStripeElementsPaymentConfig() == nil
}

func isStripeWebhookConfigured() bool {
	return validateStripeWebhookConfig() == nil
}

func isStripeWebhookEnabled() bool {
	return validateStripeAPIConfig() == nil && validateStripeWebhookConfig() == nil
}
