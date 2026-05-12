package model

import (
	"errors"
	"fmt"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/logger"

	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

const (
	PaymentMethodStripe = "stripe"
)

const (
	PaymentProviderStripe = "stripe"
)

var (
	ErrPaymentMethodMismatch = errors.New("payment method mismatch")
)

type StripeInvoiceTopUpParams struct {
	PaymentOrderId    string
	UserId            string
	InvoiceId         string
	StripeInvoiceId   string
	CheckoutSessionId string
	PaymentIntentId   string
	CustomerId        string
	PaymentMethod     string
	ProviderPayload   string
	CreditUnits       float64
	TopUpUnits        int64
	PaidAmount        float64
	Currency          string
	CallerIp          string
}

func CompleteStripeInvoiceTopUp(params StripeInvoiceTopUpParams) (bool, error) {
	if common.IsEmptyID(params.UserId) {
		return false, errors.New("invalid user id")
	}
	if strings.TrimSpace(params.InvoiceId) == "" {
		return false, errors.New("invalid invoice id")
	}
	if strings.TrimSpace(params.StripeInvoiceId) == "" {
		return false, errors.New("stripe invoice id is required")
	}
	if params.CreditUnits <= 0 {
		return false, errors.New("invalid credit amount")
	}
	quota := int(decimal.NewFromFloat(params.CreditUnits).Mul(decimal.NewFromFloat(common.SiteCreditsPerPriceUnit)).IntPart())
	if quota <= 0 {
		return false, errors.New("无效的充值额度")
	}

	var balanceAfter int
	var created bool
	var paymentOrder *StripePaymentOrder
	sourceType := "topup.stripe_checkout"
	sourceId := strings.TrimSpace(params.CheckoutSessionId)
	if sourceId == "" {
		sourceType = "topup.stripe_invoice"
		sourceId = params.InvoiceId
	}
	err := DB.Transaction(func(tx *gorm.DB) error {
		var err error
		if params.PaymentOrderId != "" {
			var completed bool
			completed, paymentOrder, err = CompleteStripePaymentOrderTx(tx, CompleteStripePaymentOrderParams{
				OrderId:                 params.PaymentOrderId,
				StripeCheckoutSessionId: params.CheckoutSessionId,
				StripeInvoiceId:         params.StripeInvoiceId,
				StripePaymentIntentId:   params.PaymentIntentId,
				StripeCustomerId:        params.CustomerId,
				PaymentMethod:           params.PaymentMethod,
				ProviderPayload:         params.ProviderPayload,
			})
			if err != nil {
				return err
			}
			if !completed {
				created = false
				return nil
			}
			sourceId = paymentOrder.Id
			sourceType = "topup.stripe_order"
		}
		created, err = CreateStripeInvoiceFulfillmentTx(tx, StripeInvoiceFulfillmentParams{
			InvoiceId:             params.StripeInvoiceId,
			Kind:                  "topup",
			UserId:                params.UserId,
			SourceType:            sourceType,
			SourceId:              sourceId,
			StripePaymentIntentId: params.PaymentIntentId,
			Metadata: map[string]interface{}{
				"payment_method":          params.PaymentMethod,
				"credit_units":            params.CreditUnits,
				"topup_units":             params.TopUpUnits,
				"paid_amount":             params.PaidAmount,
				"currency":                params.Currency,
				"customer_id":             params.CustomerId,
				"stripe_invoice_id":       params.StripeInvoiceId,
				"checkout_session_id":     params.CheckoutSessionId,
				"stripe_payment_order_id": params.PaymentOrderId,
			},
		})
		if err != nil || !created {
			return err
		}
		if params.CustomerId != "" {
			if err := tx.Model(&User{}).Where("id = ?", params.UserId).Update("stripe_customer", params.CustomerId).Error; err != nil {
				return err
			}
		}
		balanceAfter, err = GrantUserCreditsTx(tx, CreditGrantParams{
			UserId:     params.UserId,
			Amount:     quota,
			SourceType: sourceType,
			SourceId:   sourceId,
			RequestId:  common.NewRequestID(),
			Reason:     "stripe checkout topup completed",
			Metadata: map[string]interface{}{
				"fulfillment_id":          params.InvoiceId,
				"invoice_id":              params.StripeInvoiceId,
				"checkout_session_id":     params.CheckoutSessionId,
				"stripe_payment_order_id": params.PaymentOrderId,
				"payment_intent_id":       params.PaymentIntentId,
				"payment_method":          params.PaymentMethod,
				"payment_provider":        PaymentProviderStripe,
				"credit_units":            params.CreditUnits,
				"topup_units":             params.TopUpUnits,
				"paid_amount":             params.PaidAmount,
				"currency":                params.Currency,
				"customer_id":             params.CustomerId,
			},
		})
		return err
	})
	if err != nil {
		common.SysError("stripe invoice topup failed: " + err.Error())
		return false, errors.New("充值失败，请稍后重试")
	}
	if !created {
		return false, nil
	}
	updateUserQuotaCacheAfterCommit(params.UserId, balanceAfter)

	RecordTopupLog(
		params.UserId,
		params.InvoiceId,
		fmt.Sprintf("Stripe 充值成功，充值金额: %v，支付金额：%.2f %s", logger.FormatQuota(quota), params.PaidAmount, strings.ToUpper(params.Currency)),
		params.CallerIp,
		params.PaymentMethod,
		PaymentProviderStripe,
	)
	return true, nil
}
