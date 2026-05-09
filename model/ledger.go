package model

import (
	"errors"
	"fmt"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/bytedance/gopkg/util/gopool"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

const (
	CreditGrantStatusActive   = "active"
	CreditGrantStatusConsumed = "consumed"
	CreditGrantStatusRevoked  = "revoked"
	CreditGrantStatusExpired  = "expired"

	CreditLedgerEntryTypeGrant      = "grant"
	CreditLedgerEntryTypeConsume    = "consume"
	CreditLedgerEntryTypeRefund     = "refund"
	CreditLedgerEntryTypeAdjustment = "adjustment"
	CreditLedgerEntryTypeReversal   = "reversal"
	CreditLedgerEntryTypeExpire     = "expire"
)

var ErrInsufficientCreditGrantBalance = errors.New("insufficient active credit grants")

type CreditGrant struct {
	Id              int64  `json:"id" gorm:"primaryKey;column:id"`
	UserId          int    `json:"user_id" gorm:"column:user_id;index"`
	SourceType      string `json:"source_type" gorm:"column:source_type;size:64;index"`
	SourceId        string `json:"source_id" gorm:"column:source_id;size:128;index"`
	Amount          int    `json:"amount" gorm:"column:amount"`
	RemainingAmount int    `json:"remaining_amount" gorm:"column:remaining_amount;index"`
	Status          string `json:"status" gorm:"column:status;size:32;index"`
	EffectiveAt     int64  `json:"effective_at" gorm:"column:effective_at;index"`
	ExpiresAt       int64  `json:"expires_at" gorm:"column:expires_at;index"`
	CreatedAt       int64  `json:"created_at" gorm:"column:created_at;index"`
	CreatedBy       int    `json:"created_by" gorm:"column:created_by;index"`
	RequestId       string `json:"request_id" gorm:"column:request_id;size:64;index"`
	Metadata        string `json:"metadata" gorm:"column:metadata"`
}

func (CreditGrant) TableName() string {
	return "credit_grants"
}

type CreditLedgerEntry struct {
	Id           int64  `json:"id" gorm:"primaryKey;column:id"`
	UserId       int    `json:"user_id" gorm:"column:user_id;index"`
	GrantId      *int64 `json:"grant_id" gorm:"column:grant_id;index"`
	EntryType    string `json:"entry_type" gorm:"column:entry_type;size:32;index"`
	AmountDelta  int    `json:"amount_delta" gorm:"column:amount_delta"`
	BalanceAfter int    `json:"balance_after" gorm:"column:balance_after"`
	RequestId    string `json:"request_id" gorm:"column:request_id;size:64;index"`
	SourceType   string `json:"source_type" gorm:"column:source_type;size:64;index"`
	SourceId     string `json:"source_id" gorm:"column:source_id;size:128;index"`
	ActorUserId  int    `json:"actor_user_id" gorm:"column:actor_user_id;index"`
	Reason       string `json:"reason" gorm:"column:reason"`
	CreatedAt    int64  `json:"created_at" gorm:"column:created_at;index"`
	ReversalOfId *int64 `json:"reversal_of_id" gorm:"column:reversal_of_id;index"`
	Metadata     string `json:"metadata" gorm:"column:metadata"`
}

func (CreditLedgerEntry) TableName() string {
	return "credit_ledger_entries"
}

type CreditGrantParams struct {
	UserId      int
	Amount      int
	SourceType  string
	SourceId    string
	ActorUserId int
	RequestId   string
	Reason      string
	ExpiresAt   int64
	Metadata    map[string]interface{}
}

type CreditConsumeParams struct {
	UserId      int
	Amount      int
	EntryType   string
	SourceType  string
	SourceId    string
	ActorUserId int
	RequestId   string
	Reason      string
	Metadata    map[string]interface{}
}

func normalizeLedgerLabel(value string, fallback string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return fallback
	}
	return value
}

func newLedgerSourceId(prefix string, userId int) string {
	return fmt.Sprintf("%s:%d:%s", prefix, userId, common.GetUUID())
}

func ledgerMetadataString(metadata map[string]interface{}) string {
	return jsonObjectString(metadata)
}

func lockUserQuotaTx(tx *gorm.DB, userId int) (*User, error) {
	if tx == nil {
		return nil, errors.New("database transaction is nil")
	}
	if userId <= 0 {
		return nil, errors.New("user id is required")
	}
	user := &User{}
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Select("id, quota").First(user, "id = ?", userId).Error; err != nil {
		return nil, err
	}
	return user, nil
}

func updateUserQuotaProjectionTx(tx *gorm.DB, userId int, delta int) error {
	return tx.Model(&User{}).Where("id = ?", userId).Update("quota", gorm.Expr("quota + ?", delta)).Error
}

func updateUserQuotaCacheAfterCommit(userId int, balance int) {
	if !common.RedisEnabled {
		return
	}
	gopool.Go(func() {
		if err := updateUserQuotaCache(userId, balance); err != nil {
			common.SysLog("failed to update user quota cache: " + err.Error())
		}
	})
}

func GrantUserCredits(params CreditGrantParams) error {
	var balanceAfter int
	err := DB.Transaction(func(tx *gorm.DB) error {
		var err error
		balanceAfter, err = GrantUserCreditsTx(tx, params)
		return err
	})
	if err == nil {
		updateUserQuotaCacheAfterCommit(params.UserId, balanceAfter)
	}
	return err
}

func GrantUserCreditsTx(tx *gorm.DB, params CreditGrantParams) (int, error) {
	return grantUserCreditsWithEntryTypeTx(tx, params, CreditLedgerEntryTypeGrant)
}

func RefundUserCredits(params CreditGrantParams) error {
	var balanceAfter int
	err := DB.Transaction(func(tx *gorm.DB) error {
		var err error
		balanceAfter, err = grantUserCreditsWithEntryTypeTx(tx, params, CreditLedgerEntryTypeRefund)
		return err
	})
	if err == nil {
		updateUserQuotaCacheAfterCommit(params.UserId, balanceAfter)
	}
	return err
}

func grantUserCreditsWithEntryTypeTx(tx *gorm.DB, params CreditGrantParams, entryType string) (int, error) {
	if params.Amount <= 0 {
		return 0, errors.New("credit amount must be positive")
	}
	now := common.GetTimestamp()
	params.SourceType = normalizeLedgerLabel(params.SourceType, entryType)
	params.SourceId = normalizeLedgerLabel(params.SourceId, newLedgerSourceId(params.SourceType, params.UserId))
	params.RequestId = normalizeLedgerLabel(params.RequestId, common.GetUUID())
	params.Reason = normalizeLedgerLabel(params.Reason, params.SourceType)

	user, err := lockUserQuotaTx(tx, params.UserId)
	if err != nil {
		return 0, err
	}

	var existingGrant CreditGrant
	err = tx.Where("source_type = ? AND source_id = ?", params.SourceType, params.SourceId).First(&existingGrant).Error
	if err == nil {
		if existingGrant.UserId == params.UserId && existingGrant.Amount == params.Amount {
			return user.Quota, nil
		}
		return 0, errors.New("credit grant source already exists with different attributes")
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return 0, err
	}

	grant := CreditGrant{
		UserId:          params.UserId,
		SourceType:      params.SourceType,
		SourceId:        params.SourceId,
		Amount:          params.Amount,
		RemainingAmount: params.Amount,
		Status:          CreditGrantStatusActive,
		EffectiveAt:     now,
		ExpiresAt:       params.ExpiresAt,
		CreatedAt:       now,
		CreatedBy:       params.ActorUserId,
		RequestId:       params.RequestId,
		Metadata:        ledgerMetadataString(params.Metadata),
	}
	if err := tx.Create(&grant).Error; err != nil {
		return 0, err
	}

	balanceAfter := user.Quota + params.Amount
	entry := CreditLedgerEntry{
		UserId:       params.UserId,
		GrantId:      &grant.Id,
		EntryType:    entryType,
		AmountDelta:  params.Amount,
		BalanceAfter: balanceAfter,
		RequestId:    params.RequestId,
		SourceType:   params.SourceType,
		SourceId:     params.SourceId,
		ActorUserId:  params.ActorUserId,
		Reason:       params.Reason,
		CreatedAt:    now,
		Metadata:     ledgerMetadataString(params.Metadata),
	}
	if err := tx.Create(&entry).Error; err != nil {
		return 0, err
	}
	if err := updateUserQuotaProjectionTx(tx, params.UserId, params.Amount); err != nil {
		return 0, err
	}
	return balanceAfter, nil
}

func ConsumeUserCredits(params CreditConsumeParams) error {
	var balanceAfter int
	err := DB.Transaction(func(tx *gorm.DB) error {
		var err error
		balanceAfter, err = ConsumeUserCreditsTx(tx, params)
		return err
	})
	if err == nil {
		updateUserQuotaCacheAfterCommit(params.UserId, balanceAfter)
	}
	return err
}

func ConsumeUserCreditsTx(tx *gorm.DB, params CreditConsumeParams) (int, error) {
	if params.Amount <= 0 {
		return 0, errors.New("credit amount must be positive")
	}
	user, err := lockUserQuotaTx(tx, params.UserId)
	if err != nil {
		return 0, err
	}

	now := common.GetTimestamp()
	entryType := normalizeLedgerLabel(params.EntryType, CreditLedgerEntryTypeConsume)
	params.SourceType = normalizeLedgerLabel(params.SourceType, entryType)
	params.SourceId = normalizeLedgerLabel(params.SourceId, newLedgerSourceId(params.SourceType, params.UserId))
	params.RequestId = normalizeLedgerLabel(params.RequestId, common.GetUUID())
	params.Reason = normalizeLedgerLabel(params.Reason, params.SourceType)

	var existing struct {
		Count       int64
		AmountDelta int64
	}
	if err := tx.Model(&CreditLedgerEntry{}).
		Select("COUNT(*) AS count, COALESCE(SUM(amount_delta), 0) AS amount_delta").
		Where("user_id = ? AND entry_type = ? AND source_type = ? AND source_id = ?", params.UserId, entryType, params.SourceType, params.SourceId).
		Scan(&existing).Error; err != nil {
		return 0, err
	}
	if existing.Count > 0 {
		if existing.AmountDelta == int64(-params.Amount) {
			return user.Quota, nil
		}
		return 0, errors.New("credit ledger source already exists with different amount")
	}
	if user.Quota < params.Amount {
		return 0, ErrInsufficientCreditGrantBalance
	}

	var grants []CreditGrant
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
		Where("user_id = ? AND status = ? AND remaining_amount > 0 AND effective_at <= ? AND (expires_at = 0 OR expires_at > ?)", params.UserId, CreditGrantStatusActive, now, now).
		Order("CASE WHEN expires_at = 0 THEN 9223372036854775807 ELSE expires_at END ASC, effective_at ASC, id ASC").
		Find(&grants).Error; err != nil {
		return 0, err
	}

	remaining := params.Amount
	consumed := 0
	for _, grant := range grants {
		if remaining <= 0 {
			break
		}
		delta := grant.RemainingAmount
		if delta > remaining {
			delta = remaining
		}
		nextRemaining := grant.RemainingAmount - delta
		nextStatus := grant.Status
		if nextRemaining == 0 {
			nextStatus = CreditGrantStatusConsumed
		}
		if err := tx.Model(&CreditGrant{}).Where("id = ?", grant.Id).Updates(map[string]interface{}{
			"remaining_amount": nextRemaining,
			"status":           nextStatus,
		}).Error; err != nil {
			return 0, err
		}

		balanceAfter := user.Quota - consumed - delta
		grantId := grant.Id
		entry := CreditLedgerEntry{
			UserId:       params.UserId,
			GrantId:      &grantId,
			EntryType:    entryType,
			AmountDelta:  -delta,
			BalanceAfter: balanceAfter,
			RequestId:    params.RequestId,
			SourceType:   params.SourceType,
			SourceId:     params.SourceId,
			ActorUserId:  params.ActorUserId,
			Reason:       params.Reason,
			CreatedAt:    now,
			Metadata:     ledgerMetadataString(params.Metadata),
		}
		if err := tx.Create(&entry).Error; err != nil {
			return 0, err
		}
		consumed += delta
		remaining -= delta
	}
	if remaining > 0 {
		return 0, ErrInsufficientCreditGrantBalance
	}
	if err := updateUserQuotaProjectionTx(tx, params.UserId, -params.Amount); err != nil {
		return 0, err
	}
	return user.Quota - params.Amount, nil
}

func AdjustUserCredits(params CreditConsumeParams, delta int) error {
	if delta == 0 {
		return nil
	}
	if delta > 0 {
		return GrantUserCredits(CreditGrantParams{
			UserId:      params.UserId,
			Amount:      delta,
			SourceType:  normalizeLedgerLabel(params.SourceType, CreditLedgerEntryTypeAdjustment),
			SourceId:    params.SourceId,
			ActorUserId: params.ActorUserId,
			RequestId:   params.RequestId,
			Reason:      params.Reason,
			Metadata:    params.Metadata,
		})
	}
	params.Amount = -delta
	params.EntryType = CreditLedgerEntryTypeAdjustment
	params.SourceType = normalizeLedgerLabel(params.SourceType, CreditLedgerEntryTypeAdjustment)
	return ConsumeUserCredits(params)
}

func SetUserCreditBalance(userId int, targetBalance int, actorUserId int, reason string, metadata map[string]interface{}) error {
	var balanceAfter int
	err := DB.Transaction(func(tx *gorm.DB) error {
		user, err := lockUserQuotaTx(tx, userId)
		if err != nil {
			return err
		}
		delta := targetBalance - user.Quota
		if delta == 0 {
			balanceAfter = user.Quota
			return nil
		}
		if delta > 0 {
			balanceAfter, err = GrantUserCreditsTx(tx, CreditGrantParams{
				UserId:      userId,
				Amount:      delta,
				SourceType:  "admin.override",
				SourceId:    newLedgerSourceId("admin.override", userId),
				ActorUserId: actorUserId,
				RequestId:   common.GetUUID(),
				Reason:      reason,
				Metadata:    metadata,
			})
			return err
		}
		balanceAfter, err = ConsumeUserCreditsTx(tx, CreditConsumeParams{
			UserId:      userId,
			Amount:      -delta,
			EntryType:   CreditLedgerEntryTypeAdjustment,
			SourceType:  "admin.override",
			SourceId:    newLedgerSourceId("admin.override", userId),
			ActorUserId: actorUserId,
			RequestId:   common.GetUUID(),
			Reason:      reason,
			Metadata:    metadata,
		})
		return err
	})
	if err == nil {
		updateUserQuotaCacheAfterCommit(userId, balanceAfter)
	}
	return err
}

func ConsumeUserCreditsForRequest(userId int, amount int, sourceType string, sourceId string, requestId string, metadata map[string]interface{}) error {
	return ConsumeUserCredits(CreditConsumeParams{
		UserId:     userId,
		Amount:     amount,
		SourceType: sourceType,
		SourceId:   sourceId,
		RequestId:  requestId,
		Reason:     sourceType,
		Metadata:   metadata,
	})
}

func RefundUserCreditsForRequest(userId int, amount int, sourceType string, sourceId string, requestId string, metadata map[string]interface{}) error {
	return RefundUserCredits(CreditGrantParams{
		UserId:     userId,
		Amount:     amount,
		SourceType: sourceType,
		SourceId:   sourceId,
		RequestId:  requestId,
		Reason:     sourceType,
		Metadata:   metadata,
	})
}
