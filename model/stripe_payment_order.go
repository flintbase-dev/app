package model

import (
	"errors"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

const (
	StripePaymentOrderKindTopup                = "topup"
	StripePaymentOrderKindSubscriptionPurchase = "subscription_purchase"
	StripePaymentOrderKindSubscriptionSwitch   = "subscription_switch"
)

var ErrStripePaymentOrderNotFound = errors.New("stripe payment order not found")

type StripePaymentOrder struct {
	Id                      string  `json:"id" gorm:"primaryKey;type:varchar(32)"`
	UserId                  string  `json:"user_id" gorm:"type:varchar(32);index"`
	Kind                    string  `json:"kind" gorm:"type:varchar(64);index"`
	BusinessOrderId         string  `json:"business_order_id" gorm:"type:varchar(128);index"`
	Status                  string  `json:"status" gorm:"type:varchar(32);index"`
	AmountCents             int64   `json:"amount_cents"`
	DisplayAmount           float64 `json:"display_amount"`
	Currency                string  `json:"currency" gorm:"type:varchar(16);index"`
	CreditUnits             float64 `json:"credit_units"`
	TopUpUnits              int64   `json:"topup_units" gorm:"column:topup_units"`
	PaymentMethod           string  `json:"payment_method" gorm:"type:varchar(64)"`
	PaymentProvider         string  `json:"payment_provider" gorm:"type:varchar(64);index"`
	StripeCheckoutSessionId string  `json:"stripe_checkout_session_id" gorm:"type:varchar(128);index"`
	StripeInvoiceId         string  `json:"stripe_invoice_id" gorm:"type:varchar(128);index"`
	StripePaymentIntentId   string  `json:"stripe_payment_intent_id" gorm:"type:varchar(128);index"`
	StripeCustomerId        string  `json:"stripe_customer_id" gorm:"type:varchar(128);index"`
	ProviderPayload         string  `json:"provider_payload" gorm:"type:text"`
	CreatedAt               int64   `json:"created_at" gorm:"index"`
	UpdatedAt               int64   `json:"updated_at" gorm:"index"`
	CompletedAt             int64   `json:"completed_at" gorm:"index"`
}

func (StripePaymentOrder) TableName() string {
	return "stripe_payment_orders"
}

type CreatePendingStripePaymentOrderParams struct {
	UserId          string
	Kind            string
	BusinessOrderId string
	AmountCents     int64
	DisplayAmount   float64
	Currency        string
	CreditUnits     float64
	TopUpUnits      int64
	PaymentMethod   string
	PaymentProvider string
}

type CompleteStripePaymentOrderParams struct {
	OrderId                 string
	StripeCheckoutSessionId string
	StripeInvoiceId         string
	StripePaymentIntentId   string
	StripeCustomerId        string
	PaymentMethod           string
	ProviderPayload         string
}

func CreatePendingStripePaymentOrder(params CreatePendingStripePaymentOrderParams) (*StripePaymentOrder, error) {
	var order *StripePaymentOrder
	err := DB.Transaction(func(tx *gorm.DB) error {
		var err error
		order, err = CreatePendingStripePaymentOrderTx(tx, params)
		return err
	})
	return order, err
}

func CreatePendingStripePaymentOrderTx(tx *gorm.DB, params CreatePendingStripePaymentOrderParams) (*StripePaymentOrder, error) {
	if tx == nil {
		return nil, errors.New("database transaction is nil")
	}
	if common.IsEmptyID(params.UserId) || strings.TrimSpace(params.Kind) == "" {
		return nil, errors.New("invalid stripe payment order args")
	}
	method := strings.TrimSpace(params.PaymentMethod)
	if method == "" {
		method = PaymentMethodStripe
	}
	provider := strings.TrimSpace(params.PaymentProvider)
	if provider == "" {
		provider = PaymentProviderStripe
	}
	now := common.GetTimestamp()
	order := &StripePaymentOrder{
		UserId:          params.UserId,
		Kind:            strings.TrimSpace(params.Kind),
		BusinessOrderId: strings.TrimSpace(params.BusinessOrderId),
		Status:          common.TopUpStatusPending,
		AmountCents:     params.AmountCents,
		DisplayAmount:   params.DisplayAmount,
		Currency:        strings.ToUpper(strings.TrimSpace(params.Currency)),
		CreditUnits:     params.CreditUnits,
		TopUpUnits:      params.TopUpUnits,
		PaymentMethod:   method,
		PaymentProvider: provider,
		CreatedAt:       now,
		UpdatedAt:       now,
	}
	if err := tx.Create(order).Error; err != nil {
		return nil, err
	}
	return order, nil
}

func UpdateStripePaymentOrderCheckoutRefs(orderId string, checkoutSessionId string, invoiceId string, paymentIntentId string) error {
	if common.IsEmptyID(orderId) {
		return errors.New("stripe payment order id is empty")
	}
	updates := map[string]interface{}{
		"updated_at": common.GetTimestamp(),
	}
	if strings.TrimSpace(checkoutSessionId) != "" {
		updates["stripe_checkout_session_id"] = strings.TrimSpace(checkoutSessionId)
	}
	if strings.TrimSpace(invoiceId) != "" {
		updates["stripe_invoice_id"] = strings.TrimSpace(invoiceId)
	}
	if strings.TrimSpace(paymentIntentId) != "" {
		updates["stripe_payment_intent_id"] = strings.TrimSpace(paymentIntentId)
	}
	return DB.Model(&StripePaymentOrder{}).Where("id = ?", orderId).Updates(updates).Error
}

func GetStripePaymentOrderByCheckoutSessionId(checkoutSessionId string) (*StripePaymentOrder, error) {
	checkoutSessionId = strings.TrimSpace(checkoutSessionId)
	if checkoutSessionId == "" {
		return nil, ErrStripePaymentOrderNotFound
	}
	var order StripePaymentOrder
	if err := DB.First(&order, "stripe_checkout_session_id = ?", checkoutSessionId).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrStripePaymentOrderNotFound
		}
		return nil, err
	}
	return &order, nil
}

func CompleteStripePaymentOrderTx(tx *gorm.DB, params CompleteStripePaymentOrderParams) (bool, *StripePaymentOrder, error) {
	if tx == nil {
		return false, nil, errors.New("database transaction is nil")
	}
	if common.IsEmptyID(params.OrderId) {
		return false, nil, errors.New("stripe payment order id is empty")
	}
	invoiceId := strings.TrimSpace(params.StripeInvoiceId)
	if invoiceId == "" {
		return false, nil, errors.New("stripe invoice id is required")
	}
	var order StripePaymentOrder
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&order, "id = ?", params.OrderId).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return false, nil, ErrStripePaymentOrderNotFound
		}
		return false, nil, err
	}
	if order.Status == common.TopUpStatusSuccess {
		return false, &order, nil
	}
	if order.Status != common.TopUpStatusPending {
		return false, &order, errors.New("stripe payment order status invalid")
	}

	now := common.GetTimestamp()
	updates := map[string]interface{}{
		"status":            common.TopUpStatusSuccess,
		"stripe_invoice_id": invoiceId,
		"updated_at":        now,
		"completed_at":      now,
	}
	if strings.TrimSpace(params.StripeCheckoutSessionId) != "" {
		updates["stripe_checkout_session_id"] = strings.TrimSpace(params.StripeCheckoutSessionId)
	}
	if strings.TrimSpace(params.StripePaymentIntentId) != "" {
		updates["stripe_payment_intent_id"] = strings.TrimSpace(params.StripePaymentIntentId)
	}
	if strings.TrimSpace(params.StripeCustomerId) != "" {
		updates["stripe_customer_id"] = strings.TrimSpace(params.StripeCustomerId)
	}
	if strings.TrimSpace(params.PaymentMethod) != "" {
		updates["payment_method"] = strings.TrimSpace(params.PaymentMethod)
	}
	if strings.TrimSpace(params.ProviderPayload) != "" {
		updates["provider_payload"] = params.ProviderPayload
	}
	if err := tx.Model(&StripePaymentOrder{}).Where("id = ?", order.Id).Updates(updates).Error; err != nil {
		return false, &order, err
	}
	for key, value := range updates {
		switch key {
		case "status":
			order.Status = value.(string)
		case "stripe_invoice_id":
			order.StripeInvoiceId = value.(string)
		case "stripe_checkout_session_id":
			order.StripeCheckoutSessionId = value.(string)
		case "stripe_payment_intent_id":
			order.StripePaymentIntentId = value.(string)
		case "stripe_customer_id":
			order.StripeCustomerId = value.(string)
		case "payment_method":
			order.PaymentMethod = value.(string)
		case "provider_payload":
			order.ProviderPayload = value.(string)
		case "updated_at":
			order.UpdatedAt = value.(int64)
		case "completed_at":
			order.CompletedAt = value.(int64)
		}
	}
	return true, &order, nil
}

func FailStripePaymentOrder(orderId string, providerPayload string) error {
	return setStripePaymentOrderTerminalStatus(orderId, common.TopUpStatusFailed, providerPayload)
}

func ExpireStripePaymentOrder(orderId string) error {
	return setStripePaymentOrderTerminalStatus(orderId, common.TopUpStatusExpired, "")
}

func setStripePaymentOrderTerminalStatus(orderId string, status string, providerPayload string) error {
	if common.IsEmptyID(orderId) {
		return nil
	}
	return DB.Transaction(func(tx *gorm.DB) error {
		var order StripePaymentOrder
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&order, "id = ?", orderId).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrStripePaymentOrderNotFound
			}
			return err
		}
		if order.Status != common.TopUpStatusPending {
			return nil
		}
		updates := map[string]interface{}{
			"status":       status,
			"updated_at":   common.GetTimestamp(),
			"completed_at": common.GetTimestamp(),
		}
		if strings.TrimSpace(providerPayload) != "" {
			updates["provider_payload"] = providerPayload
		}
		return tx.Model(&StripePaymentOrder{}).Where("id = ?", order.Id).Updates(updates).Error
	})
}
