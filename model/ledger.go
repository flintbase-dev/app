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
	Id              string `json:"id" gorm:"primaryKey;column:id;type:varchar(32)"`
	UserId          string `json:"user_id" gorm:"column:user_id;type:varchar(32);index"`
	AccountType     string `json:"account_type" gorm:"column:account_type;type:varchar(16);index;default:'personal'"`
	AccountId       string `json:"account_id" gorm:"column:account_id;type:varchar(32);index;default:''"`
	SourceType      string `json:"source_type" gorm:"column:source_type;size:64;index"`
	SourceId        string `json:"source_id" gorm:"column:source_id;size:128;index"`
	Amount          int    `json:"amount" gorm:"column:amount"`
	RemainingAmount int    `json:"remaining_amount" gorm:"column:remaining_amount;index"`
	Status          string `json:"status" gorm:"column:status;size:32;index"`
	EffectiveAt     int64  `json:"effective_at" gorm:"column:effective_at;index"`
	ExpiresAt       int64  `json:"expires_at" gorm:"column:expires_at;index"`
	CreatedAt       int64  `json:"created_at" gorm:"column:created_at;index"`
	CreatedBy       string `json:"created_by" gorm:"column:created_by;type:varchar(32);index"`
	RequestId       string `json:"request_id" gorm:"column:request_id;size:64;index"`
	Metadata        string `json:"metadata" gorm:"column:metadata"`
}

func (CreditGrant) TableName() string {
	return "credit_grants"
}

type CreditLedgerEntry struct {
	Id           string  `json:"id" gorm:"primaryKey;column:id;type:varchar(32)"`
	UserId       string  `json:"user_id" gorm:"column:user_id;type:varchar(32);index"`
	AccountType  string  `json:"account_type" gorm:"column:account_type;type:varchar(16);index;default:'personal'"`
	AccountId    string  `json:"account_id" gorm:"column:account_id;type:varchar(32);index;default:''"`
	GrantId      *string `json:"grant_id" gorm:"column:grant_id;type:varchar(32);index"`
	EntryType    string  `json:"entry_type" gorm:"column:entry_type;size:32;index"`
	AmountDelta  int     `json:"amount_delta" gorm:"column:amount_delta"`
	BalanceAfter int     `json:"balance_after" gorm:"column:balance_after"`
	RequestId    string  `json:"request_id" gorm:"column:request_id;size:64;index"`
	SourceType   string  `json:"source_type" gorm:"column:source_type;size:64;index"`
	SourceId     string  `json:"source_id" gorm:"column:source_id;size:128;index"`
	ActorUserId  string  `json:"actor_user_id" gorm:"column:actor_user_id;type:varchar(32);index"`
	Reason       string  `json:"reason" gorm:"column:reason"`
	CreatedAt    int64   `json:"created_at" gorm:"column:created_at;index"`
	ReversalOfId *string `json:"reversal_of_id" gorm:"column:reversal_of_id;type:varchar(32);index"`
	Metadata     string  `json:"metadata" gorm:"column:metadata"`
}

func (CreditLedgerEntry) TableName() string {
	return "credit_ledger_entries"
}

type CreditGrantParams struct {
	UserId      string
	AccountType string
	AccountId   string
	Amount      int
	SourceType  string
	SourceId    string
	ActorUserId string
	RequestId   string
	Reason      string
	ExpiresAt   int64
	Metadata    map[string]interface{}
}

type CreditConsumeParams struct {
	UserId      string
	AccountType string
	AccountId   string
	Amount      int
	EntryType   string
	SourceType  string
	SourceId    string
	ActorUserId string
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

func newLedgerSourceId(prefix string, userId string) string {
	return fmt.Sprintf("%s:%s:%s", prefix, userId, common.NewGeneralID())
}

func ledgerMetadataString(metadata map[string]interface{}) string {
	return jsonObjectString(metadata)
}

func lockUserQuotaTx(tx *gorm.DB, userId string) (*User, error) {
	if tx == nil {
		return nil, errors.New("database transaction is nil")
	}
	if common.IsEmptyID(userId) {
		return nil, errors.New("user id is required")
	}
	user := &User{}
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Select("id, quota").First(user, "id = ?", userId).Error; err != nil {
		return nil, err
	}
	return user, nil
}

func normalizeGrantAccount(params CreditGrantParams) (CreditGrantParams, AccountContext, error) {
	if params.AccountType == "" {
		params.AccountType = AccountTypePersonal
	}
	if params.AccountId == "" {
		params.AccountId = params.UserId
	}
	ctx, err := NormalizeAccountContext(params.AccountType, params.AccountId)
	return params, ctx, err
}

func normalizeConsumeAccount(params CreditConsumeParams) (CreditConsumeParams, AccountContext, error) {
	if params.AccountType == "" {
		params.AccountType = AccountTypePersonal
	}
	if params.AccountId == "" {
		params.AccountId = params.UserId
	}
	ctx, err := NormalizeAccountContext(params.AccountType, params.AccountId)
	return params, ctx, err
}

func lockAccountQuotaTx(tx *gorm.DB, ctx AccountContext) (int, error) {
	if tx == nil {
		return 0, errors.New("database transaction is nil")
	}
	switch ctx.Type {
	case AccountTypePersonal:
		user, err := lockUserQuotaTx(tx, ctx.Id)
		if err != nil {
			return 0, err
		}
		return user.Quota, nil
	case AccountTypeTeam:
		var team Team
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Select("id, quota").First(&team, "id = ? AND status = ?", ctx.Id, TeamStatusActive).Error; err != nil {
			return 0, err
		}
		return team.Quota, nil
	default:
		return 0, errors.New("unsupported account type")
	}
}

func updateAccountQuotaProjectionTx(tx *gorm.DB, ctx AccountContext, delta int) error {
	switch ctx.Type {
	case AccountTypePersonal:
		return updateUserQuotaProjectionTx(tx, ctx.Id, delta)
	case AccountTypeTeam:
		return tx.Model(&Team{}).Where("id = ?", ctx.Id).Updates(map[string]interface{}{
			"quota":      gorm.Expr("quota + ?", delta),
			"updated_at": common.GetTimestamp(),
		}).Error
	default:
		return errors.New("unsupported account type")
	}
}

func updateUserQuotaProjectionTx(tx *gorm.DB, userId string, delta int) error {
	return tx.Model(&User{}).Where("id = ?", userId).Update("quota", gorm.Expr("quota + ?", delta)).Error
}

func updateUserQuotaCacheAfterCommit(userId string, balance int) {
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
	params.AccountType = AccountTypePersonal
	params.AccountId = params.UserId
	return GrantAccountCredits(params)
}

func GrantAccountCredits(params CreditGrantParams) error {
	var balanceAfter int
	err := DB.Transaction(func(tx *gorm.DB) error {
		var err error
		balanceAfter, err = GrantUserCreditsTx(tx, params)
		return err
	})
	if err == nil && params.AccountType == AccountTypePersonal {
		updateUserQuotaCacheAfterCommit(params.UserId, balanceAfter)
	}
	return err
}

func GrantUserCreditsTx(tx *gorm.DB, params CreditGrantParams) (int, error) {
	return grantUserCreditsWithEntryTypeTx(tx, params, CreditLedgerEntryTypeGrant)
}

func RefundUserCredits(params CreditGrantParams) error {
	params.AccountType = AccountTypePersonal
	params.AccountId = params.UserId
	return RefundAccountCredits(params)
}

func RefundAccountCredits(params CreditGrantParams) error {
	var balanceAfter int
	err := DB.Transaction(func(tx *gorm.DB) error {
		var err error
		balanceAfter, err = grantUserCreditsWithEntryTypeTx(tx, params, CreditLedgerEntryTypeRefund)
		return err
	})
	if err == nil && params.AccountType == AccountTypePersonal {
		updateUserQuotaCacheAfterCommit(params.UserId, balanceAfter)
	}
	return err
}

func grantUserCreditsWithEntryTypeTx(tx *gorm.DB, params CreditGrantParams, entryType string) (int, error) {
	if params.Amount <= 0 {
		return 0, errors.New("credit amount must be positive")
	}
	var account AccountContext
	var err error
	params, account, err = normalizeGrantAccount(params)
	if err != nil {
		return 0, err
	}
	now := common.GetTimestamp()
	params.SourceType = normalizeLedgerLabel(params.SourceType, entryType)
	params.SourceId = normalizeLedgerLabel(params.SourceId, newLedgerSourceId(params.SourceType, account.Id))
	params.RequestId = normalizeLedgerLabel(params.RequestId, common.NewRequestID())
	params.Reason = normalizeLedgerLabel(params.Reason, params.SourceType)

	accountBalance, err := lockAccountQuotaTx(tx, account)
	if err != nil {
		return 0, err
	}

	var existingGrant CreditGrant
	err = tx.Where("source_type = ? AND source_id = ?", params.SourceType, params.SourceId).First(&existingGrant).Error
	if err == nil {
		if existingGrant.AccountType == account.Type && existingGrant.AccountId == account.Id && existingGrant.Amount == params.Amount {
			return accountBalance, nil
		}
		return 0, errors.New("credit grant source already exists with different attributes")
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return 0, err
	}

	grant := CreditGrant{
		UserId:          params.UserId,
		AccountType:     account.Type,
		AccountId:       account.Id,
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

	balanceAfter := accountBalance + params.Amount
	entry := CreditLedgerEntry{
		UserId:       params.UserId,
		AccountType:  account.Type,
		AccountId:    account.Id,
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
	if err := updateAccountQuotaProjectionTx(tx, account, params.Amount); err != nil {
		return 0, err
	}
	return balanceAfter, nil
}

func ConsumeUserCredits(params CreditConsumeParams) error {
	params.AccountType = AccountTypePersonal
	params.AccountId = params.UserId
	return ConsumeAccountCredits(params)
}

func ConsumeAccountCredits(params CreditConsumeParams) error {
	var balanceAfter int
	err := DB.Transaction(func(tx *gorm.DB) error {
		var err error
		balanceAfter, err = ConsumeUserCreditsTx(tx, params)
		return err
	})
	if err == nil && params.AccountType == AccountTypePersonal {
		updateUserQuotaCacheAfterCommit(params.UserId, balanceAfter)
	}
	return err
}

func ConsumeUserCreditsTx(tx *gorm.DB, params CreditConsumeParams) (int, error) {
	if params.Amount <= 0 {
		return 0, errors.New("credit amount must be positive")
	}
	var account AccountContext
	var err error
	params, account, err = normalizeConsumeAccount(params)
	if err != nil {
		return 0, err
	}
	accountBalance, err := lockAccountQuotaTx(tx, account)
	if err != nil {
		return 0, err
	}

	now := common.GetTimestamp()
	entryType := normalizeLedgerLabel(params.EntryType, CreditLedgerEntryTypeConsume)
	params.SourceType = normalizeLedgerLabel(params.SourceType, entryType)
	params.SourceId = normalizeLedgerLabel(params.SourceId, newLedgerSourceId(params.SourceType, account.Id))
	params.RequestId = normalizeLedgerLabel(params.RequestId, common.NewRequestID())
	params.Reason = normalizeLedgerLabel(params.Reason, params.SourceType)

	var existing struct {
		Count       int64
		AmountDelta int64
	}
	if err := tx.Model(&CreditLedgerEntry{}).
		Select("COUNT(*) AS count, COALESCE(SUM(amount_delta), 0) AS amount_delta").
		Where("account_type = ? AND account_id = ? AND entry_type = ? AND source_type = ? AND source_id = ?", account.Type, account.Id, entryType, params.SourceType, params.SourceId).
		Scan(&existing).Error; err != nil {
		return 0, err
	}
	if existing.Count > 0 {
		if existing.AmountDelta == int64(-params.Amount) {
			return accountBalance, nil
		}
		return 0, errors.New("credit ledger source already exists with different amount")
	}
	if accountBalance < params.Amount {
		return 0, ErrInsufficientCreditGrantBalance
	}

	var grants []CreditGrant
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
		Where("account_type = ? AND account_id = ? AND status = ? AND remaining_amount > 0 AND effective_at <= ? AND (expires_at = 0 OR expires_at > ?)", account.Type, account.Id, CreditGrantStatusActive, now, now).
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

		balanceAfter := accountBalance - consumed - delta
		grantId := grant.Id
		entry := CreditLedgerEntry{
			UserId:       params.UserId,
			AccountType:  account.Type,
			AccountId:    account.Id,
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
	if err := updateAccountQuotaProjectionTx(tx, account, -params.Amount); err != nil {
		return 0, err
	}
	return accountBalance - params.Amount, nil
}

func AdjustUserCredits(params CreditConsumeParams, delta int) error {
	if delta == 0 {
		return nil
	}
	if delta > 0 {
		return GrantAccountCredits(CreditGrantParams{
			UserId:      params.UserId,
			AccountType: params.AccountType,
			AccountId:   params.AccountId,
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

func SetUserCreditBalance(userId string, targetBalance int, actorUserId string, reason string, metadata map[string]interface{}) error {
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
				RequestId:   common.NewRequestID(),
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
			RequestId:   common.NewRequestID(),
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

func ConsumeUserCreditsForRequest(userId string, amount int, sourceType string, sourceId string, requestId string, metadata map[string]interface{}) error {
	return ConsumeAccountCredits(CreditConsumeParams{
		UserId:      userId,
		AccountType: AccountTypePersonal,
		AccountId:   userId,
		Amount:      amount,
		SourceType:  sourceType,
		SourceId:    sourceId,
		RequestId:   requestId,
		Reason:      sourceType,
		Metadata:    metadata,
	})
}

func RefundUserCreditsForRequest(userId string, amount int, sourceType string, sourceId string, requestId string, metadata map[string]interface{}) error {
	return RefundAccountCredits(CreditGrantParams{
		UserId:      userId,
		AccountType: AccountTypePersonal,
		AccountId:   userId,
		Amount:      amount,
		SourceType:  sourceType,
		SourceId:    sourceId,
		RequestId:   requestId,
		Reason:      sourceType,
		Metadata:    metadata,
	})
}

func ConsumeAccountCreditsForRequest(actorUserId string, account AccountContext, amount int, sourceType string, sourceId string, requestId string, metadata map[string]interface{}) error {
	return ConsumeAccountCredits(CreditConsumeParams{
		UserId:      actorUserId,
		AccountType: account.Type,
		AccountId:   account.Id,
		Amount:      amount,
		SourceType:  sourceType,
		SourceId:    sourceId,
		RequestId:   requestId,
		Reason:      sourceType,
		Metadata:    metadata,
	})
}

func RefundAccountCreditsForRequest(actorUserId string, account AccountContext, amount int, sourceType string, sourceId string, requestId string, metadata map[string]interface{}) error {
	return RefundAccountCredits(CreditGrantParams{
		UserId:      actorUserId,
		AccountType: account.Type,
		AccountId:   account.Id,
		Amount:      amount,
		SourceType:  sourceType,
		SourceId:    sourceId,
		RequestId:   requestId,
		Reason:      sourceType,
		Metadata:    metadata,
	})
}
