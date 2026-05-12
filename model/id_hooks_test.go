package model

import (
	"testing"

	"github.com/QuantumNous/new-api/common"
)

func TestBeforeCreateHooksGenerateTypedIDs(t *testing.T) {
	tests := []struct {
		name   string
		prefix string
		create func() (string, error)
	}{
		{name: "user", prefix: "usr", create: func() (string, error) {
			item := &User{}
			err := item.BeforeCreate(nil)
			return item.Id, err
		}},
		{name: "message", prefix: "msg", create: func() (string, error) {
			item := &UserMessage{}
			err := item.BeforeCreate(nil)
			return item.Id, err
		}},
		{name: "broadcast", prefix: "brd", create: func() (string, error) {
			item := &Broadcast{}
			err := item.BeforeCreate(nil)
			return item.Id, err
		}},
		{name: "broadcast read receipt", prefix: "brr", create: func() (string, error) {
			item := &BroadcastReadReceipt{}
			err := item.BeforeCreate(nil)
			return item.Id, err
		}},
		{name: "token", prefix: "tok", create: func() (string, error) {
			item := &Token{}
			err := item.BeforeCreate(nil)
			return item.Id, err
		}},
		{name: "channel", prefix: "chn", create: func() (string, error) {
			item := &Channel{}
			err := item.BeforeCreate(nil)
			return item.Id, err
		}},
		{name: "redemption", prefix: "red", create: func() (string, error) {
			item := &Redemption{}
			err := item.BeforeCreate(nil)
			return item.Id, err
		}},
		{name: "credit grant", prefix: "grn", create: func() (string, error) {
			item := &CreditGrant{}
			err := item.BeforeCreate(nil)
			return item.Id, err
		}},
		{name: "ledger", prefix: "led", create: func() (string, error) {
			item := &CreditLedgerEntry{}
			err := item.BeforeCreate(nil)
			return item.Id, err
		}},
		{name: "log", prefix: "log", create: func() (string, error) {
			item := &Log{}
			err := item.BeforeCreate(nil)
			return item.Id, err
		}},
		{name: "model", prefix: "mdl", create: func() (string, error) {
			item := &Model{}
			err := item.BeforeCreate(nil)
			return item.Id, err
		}},
		{name: "vendor", prefix: "ven", create: func() (string, error) {
			item := &Vendor{}
			err := item.BeforeCreate(nil)
			return item.Id, err
		}},
		{name: "prefill group", prefix: "pfg", create: func() (string, error) {
			item := &PrefillGroup{}
			err := item.BeforeCreate(nil)
			return item.Id, err
		}},
		{name: "setup", prefix: "set", create: func() (string, error) {
			item := &Setup{}
			err := item.BeforeCreate(nil)
			return item.ID, err
		}},
		{name: "checkin", prefix: "chk", create: func() (string, error) {
			item := &Checkin{}
			err := item.BeforeCreate(nil)
			return item.Id, err
		}},
		{name: "subscription order", prefix: "sod", create: func() (string, error) {
			item := &SubscriptionOrder{}
			err := item.BeforeCreate(nil)
			return item.Id, err
		}},
		{name: "stripe invoice fulfillment", prefix: "sif", create: func() (string, error) {
			item := &StripeInvoiceFulfillment{}
			err := item.BeforeCreate(nil)
			return item.Id, err
		}},
		{name: "stripe payment order", prefix: "spo", create: func() (string, error) {
			item := &StripePaymentOrder{}
			err := item.BeforeCreate(nil)
			return item.Id, err
		}},
		{name: "subscription plan", prefix: "spl", create: func() (string, error) {
			item := &SubscriptionPlan{}
			err := item.BeforeCreate(nil)
			return item.Id, err
		}},
		{name: "user subscription", prefix: "sus", create: func() (string, error) {
			item := &UserSubscription{}
			err := item.BeforeCreate(nil)
			return item.Id, err
		}},
		{name: "subscription pre consume", prefix: "spr", create: func() (string, error) {
			item := &SubscriptionPreConsumeRecord{}
			err := item.BeforeCreate(nil)
			return item.Id, err
		}},
		{name: "perf metric", prefix: "met", create: func() (string, error) {
			item := &PerfMetric{}
			err := item.BeforeCreate(nil)
			return item.Id, err
		}},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			id, err := tt.create()
			if err != nil {
				t.Fatalf("BeforeCreate returned error: %v", err)
			}
			if !common.IsTypedID(id, tt.prefix) {
				t.Fatalf("generated ID %q does not match prefix %q", id, tt.prefix)
			}
		})
	}
}
