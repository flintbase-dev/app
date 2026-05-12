package model

import (
	"errors"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

const (
	StripeInvoiceFulfillmentStatusCompleted = "completed"
)

type StripeInvoiceFulfillment struct {
	Id                    string `json:"id" gorm:"primaryKey;type:varchar(32)"`
	InvoiceId             string `json:"invoice_id" gorm:"type:varchar(128);uniqueIndex"`
	Kind                  string `json:"kind" gorm:"type:varchar(64);index"`
	UserId                string `json:"user_id" gorm:"type:varchar(32);index"`
	SourceType            string `json:"source_type" gorm:"type:varchar(64);index"`
	SourceId              string `json:"source_id" gorm:"type:varchar(128);index"`
	StripePaymentIntentId string `json:"stripe_payment_intent_id" gorm:"type:varchar(128);index"`
	Status                string `json:"status" gorm:"type:varchar(32);default:'completed';index"`
	CreatedAt             int64  `json:"created_at" gorm:"bigint;index"`
	Metadata              string `json:"metadata" gorm:"type:text"`
}

func (StripeInvoiceFulfillment) TableName() string {
	return "stripe_invoice_fulfillments"
}

type StripeInvoiceFulfillmentParams struct {
	InvoiceId             string
	Kind                  string
	UserId                string
	SourceType            string
	SourceId              string
	StripePaymentIntentId string
	Metadata              map[string]interface{}
}

func CreateStripeInvoiceFulfillmentTx(tx *gorm.DB, params StripeInvoiceFulfillmentParams) (bool, error) {
	if tx == nil {
		return false, errors.New("database transaction is nil")
	}
	invoiceId := strings.TrimSpace(params.InvoiceId)
	if invoiceId == "" {
		return false, errors.New("stripe invoice id is required")
	}
	fulfillment := StripeInvoiceFulfillment{
		InvoiceId:             invoiceId,
		Kind:                  strings.TrimSpace(params.Kind),
		UserId:                params.UserId,
		SourceType:            strings.TrimSpace(params.SourceType),
		SourceId:              strings.TrimSpace(params.SourceId),
		StripePaymentIntentId: strings.TrimSpace(params.StripePaymentIntentId),
		Status:                StripeInvoiceFulfillmentStatusCompleted,
		CreatedAt:             common.GetTimestamp(),
		Metadata:              jsonObjectString(params.Metadata),
	}
	result := tx.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "invoice_id"}},
		DoNothing: true,
	}).Create(&fulfillment)
	if result.Error != nil {
		return false, result.Error
	}
	return result.RowsAffected > 0, nil
}
