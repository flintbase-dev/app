package controller

import (
	"strconv"
	"sync"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting"
	"github.com/QuantumNous/new-api/setting/operation_setting"

	"github.com/gin-gonic/gin"
)

func GetTopUpInfo(c *gin.Context) {
	payMethods := make([]map[string]string, 0, 1)

	if isStripeTopUpEnabled() {
		payMethods = append(payMethods, map[string]string{
			"name":      "Stripe",
			"type":      model.PaymentMethodStripe,
			"color":     "rgba(var(--semi-purple-5), 1)",
			"min_topup": strconv.Itoa(setting.StripeMinTopUp),
		})
	}

	data := gin.H{
		"enable_stripe_topup":    isStripeTopUpEnabled(),
		"pay_methods":            payMethods,
		"stripe_min_topup":       setting.StripeMinTopUp,
		"stripe_publishable_key": setting.StripePublishableKey,
		"stripe_payment_method_types": []string{
			"card",
			"alipay",
			"wechat_pay",
		},
		"amount_options": operation_setting.GetPaymentSetting().AmountOptions,
		"discount":       operation_setting.GetPaymentSetting().AmountDiscount,
		"topup_link":     common.TopUpLink,
	}
	common.ApiSuccess(c, data)
}

// tradeNo lock
var orderLocks sync.Map
var createLock sync.Mutex

// refCountedMutex 带引用计数的互斥锁，确保最后一个使用者才从 map 中删除
type refCountedMutex struct {
	mu       sync.Mutex
	refCount int
}

// LockOrder 尝试对给定订单号加锁
func LockOrder(tradeNo string) {
	createLock.Lock()
	var rcm *refCountedMutex
	if v, ok := orderLocks.Load(tradeNo); ok {
		rcm = v.(*refCountedMutex)
	} else {
		rcm = &refCountedMutex{}
		orderLocks.Store(tradeNo, rcm)
	}
	rcm.refCount++
	createLock.Unlock()
	rcm.mu.Lock()
}

// UnlockOrder 释放给定订单号的锁
func UnlockOrder(tradeNo string) {
	v, ok := orderLocks.Load(tradeNo)
	if !ok {
		return
	}
	rcm := v.(*refCountedMutex)
	rcm.mu.Unlock()

	createLock.Lock()
	rcm.refCount--
	if rcm.refCount == 0 {
		orderLocks.Delete(tradeNo)
	}
	createLock.Unlock()
}

func GetUserTopUps(c *gin.Context) {
	userId := c.GetString("id")
	pageInfo := common.GetPageQuery(c)
	keyword := c.Query("keyword")

	user, err := model.GetUserById(userId, false)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if user == nil || user.StripeCustomer == "" {
		pageInfo.SetTotal(0)
		pageInfo.SetItems([]StripeInvoiceRecord{})
		common.ApiSuccess(c, pageInfo)
		return
	}
	topups, total, err := listStripeInvoiceRecords(user.StripeCustomer, keyword, pageInfo)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	pageInfo.SetTotal(int(total))
	pageInfo.SetItems(topups)
	common.ApiSuccess(c, pageInfo)
}

// GetAllTopUps 管理员获取全平台充值记录
func GetAllTopUps(c *gin.Context) {
	pageInfo := common.GetPageQuery(c)
	keyword := c.Query("keyword")

	topups, total, err := listStripeInvoiceRecords("", keyword, pageInfo)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	pageInfo.SetTotal(int(total))
	pageInfo.SetItems(topups)
	common.ApiSuccess(c, pageInfo)
}
