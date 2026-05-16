package service

import (
	"errors"
	"fmt"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/dto"
	"github.com/QuantumNous/new-api/logger"
	"github.com/QuantumNous/new-api/model"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
	"github.com/QuantumNous/new-api/setting/system_setting"

	"github.com/bytedance/gopkg/util/gopool"
)

func PreConsumeTokenQuota(relayInfo *relaycommon.RelayInfo, quota int) error {
	if relayInfo == nil {
		return errors.New("relay info is nil")
	}
	if quota < 0 {
		return errors.New("quota 不能为负数！")
	}
	if relayInfo.IsPlayground {
		return nil
	}
	//if relayInfo.TokenUnlimited {
	//	return nil
	//}
	token, err := model.GetTokenByHash(relayInfo.TokenKey)
	if err != nil {
		return err
	}
	if !relayInfo.TokenUnlimited && token.RemainQuota < quota {
		return fmt.Errorf("token quota is not enough, token remain quota: %s, need quota: %s", logger.FormatQuota(token.RemainQuota), logger.FormatQuota(quota))
	}
	err = model.DecreaseTokenQuota(relayInfo.TokenId, relayInfo.TokenKey, quota)
	if err != nil {
		return err
	}
	return nil
}

func ResolveRelayAccountContext(relayInfo *relaycommon.RelayInfo) (model.AccountContext, error) {
	if relayInfo == nil {
		return model.AccountContext{}, errors.New("relay info is nil")
	}
	if (relayInfo.AccountType != "") != (relayInfo.AccountId != "") {
		return model.AccountContext{}, fmt.Errorf("partial account context: user_id=%s account_type=%s account_id=%s request_id=%s", relayInfo.UserId, relayInfo.AccountType, relayInfo.AccountId, relayInfo.RequestId)
	}
	if relayInfo.AccountType == "" && relayInfo.AccountId == "" {
		return model.PersonalAccountContext(relayInfo.UserId), nil
	}
	account, err := model.NormalizeAccountContext(relayInfo.AccountType, relayInfo.AccountId)
	if err != nil {
		common.SysLog(fmt.Sprintf("quota: account normalization failed user_id=%s account_type=%s account_id=%s request_id=%s error=%v", relayInfo.UserId, relayInfo.AccountType, relayInfo.AccountId, relayInfo.RequestId, err))
		return model.AccountContext{}, fmt.Errorf("invalid account context: account_type=%s account_id=%s request_id=%s: %w", relayInfo.AccountType, relayInfo.AccountId, relayInfo.RequestId, err)
	}
	relayInfo.AccountType = account.Type
	relayInfo.AccountId = account.Id
	return account, nil
}

func PostConsumeQuota(relayInfo *relaycommon.RelayInfo, quota int, preConsumedQuota int, sendEmail bool) (err error) {
	if relayInfo == nil {
		return errors.New("relay info is nil")
	}
	account, err := ResolveRelayAccountContext(relayInfo)
	if err != nil {
		return err
	}

	// 1) Consume from wallet quota OR subscription item
	if relayInfo.BillingSource == BillingSourceSubscription {
		if common.IsEmptyID(relayInfo.SubscriptionId) {
			return errors.New("subscription id is missing")
		}
		delta := int64(quota)
		if delta != 0 {
			if err := model.PostConsumeUserSubscriptionDelta(relayInfo.SubscriptionId, delta); err != nil {
				return err
			}
			relayInfo.SubscriptionPostDelta += delta
		}
	} else {
		// Wallet
		if quota > 0 {
			err = model.ConsumeAccountCreditsForRequest(relayInfo.UserId, account, quota, "relay.settle", walletLedgerSourceId(relayInfo.RequestId, "settle"), relayInfo.RequestId, map[string]interface{}{
				"model": relayInfo.OriginModelName,
				"phase": "settle",
			})
		} else {
			err = model.RefundAccountCreditsForRequest(relayInfo.UserId, account, -quota, "relay.refund", walletLedgerSourceId(relayInfo.RequestId, "settle_refund"), relayInfo.RequestId, map[string]interface{}{
				"model": relayInfo.OriginModelName,
				"phase": "settle_refund",
			})
		}
		if err != nil {
			return err
		}
	}

	if !relayInfo.IsPlayground {
		if quota > 0 {
			err = model.DecreaseTokenQuota(relayInfo.TokenId, relayInfo.TokenKey, quota)
		} else {
			err = model.IncreaseTokenQuota(relayInfo.TokenId, relayInfo.TokenKey, -quota)
		}
		if err != nil {
			return err
		}
	}

	if sendEmail {
		if (quota + preConsumedQuota) != 0 {
			checkAndSendQuotaNotify(relayInfo, quota, preConsumedQuota)
		}
	}

	return nil
}

func checkAndSendQuotaNotify(relayInfo *relaycommon.RelayInfo, quota int, preConsumedQuota int) {
	gopool.Go(func() {
		userSetting := relayInfo.UserSetting
		threshold := common.QuotaRemindThreshold
		if userSetting.QuotaWarningThreshold != 0 {
			threshold = int(userSetting.QuotaWarningThreshold)
		}

		//noMoreQuota := userCache.Quota-(quota+preConsumedQuota) <= 0
		quotaTooLow := false
		consumeQuota := quota + preConsumedQuota
		if relayInfo.UserQuota-consumeQuota < threshold {
			quotaTooLow = true
		}
		if quotaTooLow {
			prompt := "您的额度即将用尽"
			topUpLink := fmt.Sprintf("%s/console/topup", system_setting.ServerAddress)

			content := "{{value}}，当前剩余额度为 {{value}}，为了不影响您的使用，请及时充值。<br/>充值链接：<a href='{{value}}'>{{value}}</a>"
			values := []interface{}{prompt, logger.FormatQuota(relayInfo.UserQuota), topUpLink, topUpLink}

			err := NotifyUser(relayInfo.UserId, relayInfo.UserEmail, dto.NewNotify(dto.NotifyTypeQuotaExceed, prompt, content, values))
			if err != nil {
				common.SysError(fmt.Sprintf("failed to send quota notify to user %s: %s", relayInfo.UserId, err.Error()))
			}
		}
	})
}

func checkAndSendSubscriptionQuotaNotify(relayInfo *relaycommon.RelayInfo) {
	gopool.Go(func() {
		if relayInfo == nil {
			return
		}
		if common.IsEmptyID(relayInfo.SubscriptionId) || relayInfo.SubscriptionAmountTotal <= 0 {
			return
		}

		userSetting := relayInfo.UserSetting
		threshold := common.QuotaRemindThreshold
		if userSetting.QuotaWarningThreshold != 0 {
			threshold = int(userSetting.QuotaWarningThreshold)
		}

		usedAfter := relayInfo.SubscriptionAmountUsedAfterPreConsume + relayInfo.SubscriptionPostDelta
		remaining := relayInfo.SubscriptionAmountTotal - usedAfter
		if remaining >= int64(threshold) {
			return
		}

		prompt := "您的订阅额度即将用尽"
		topUpLink := fmt.Sprintf("%s/console/topup", system_setting.ServerAddress)

		content := "{{value}}，当前剩余额度为 {{value}}，为了不影响您的使用，请及时充值。<br/>充值链接：<a href='{{value}}'>{{value}}</a>"
		values := []interface{}{prompt, logger.FormatQuota(int(remaining)), topUpLink, topUpLink}

		if err := NotifyUser(relayInfo.UserId, relayInfo.UserEmail, dto.NewNotify(dto.NotifyTypeQuotaExceed, prompt, content, values)); err != nil {
			common.SysError(fmt.Sprintf("failed to send subscription quota notify to user %s: %s", relayInfo.UserId, err.Error()))
		}
	})
}
