package controller

import (
	"fmt"
	"net/http"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/logger"
	"github.com/QuantumNous/new-api/model"
	"github.com/gin-gonic/gin"
	"github.com/thanhpk/randstr"
)

type SubscriptionStripePayRequest struct {
	PlanId             string `json:"plan_id"`
	Mode               string `json:"mode"`
	FromSubscriptionId string `json:"from_subscription_id"`
}

func SubscriptionRequestStripePay(c *gin.Context) {
	var req SubscriptionStripePayRequest
	if err := c.ShouldBindJSON(&req); err != nil || common.IsEmptyID(req.PlanId) {
		common.ApiErrorMsg(c, "参数错误")
		return
	}
	if err := validateStripeElementsPaymentConfig(); err != nil {
		common.ApiErrorMsg(c, err.Error())
		return
	}

	plan, err := model.GetSubscriptionPlanById(req.PlanId)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if !plan.Enabled {
		common.ApiErrorMsg(c, "套餐未启用")
		return
	}

	userId := c.GetString("id")
	user, err := model.GetUserById(userId, false)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if user == nil {
		common.ApiErrorMsg(c, "用户不存在")
		return
	}

	purchaseMode := model.SubscriptionOrderModePurchase
	if req.Mode == model.SubscriptionOrderModeSwitch {
		purchaseMode = model.SubscriptionOrderModeSwitch
	}

	reference := fmt.Sprintf("sub-stripe-invoice-%s-%d-%s", user.Id, time.Now().UnixMilli(), randstr.String(4))
	referenceId := "sub_inv_" + common.Sha1([]byte(reference))
	order, err := model.CreatePendingSubscriptionOrder(model.CreatePendingSubscriptionOrderParams{
		UserId:             userId,
		Plan:               plan,
		TradeNo:            referenceId,
		PaymentMethod:      model.PaymentMethodStripe,
		PaymentProvider:    model.PaymentProviderStripe,
		PurchaseMode:       purchaseMode,
		FromSubscriptionId: req.FromSubscriptionId,
	})
	if err != nil {
		common.ApiErrorMsg(c, err.Error())
		return
	}

	amountCents, err := moneyToStripeAmountCents(order.Money)
	if err != nil {
		_ = model.FailSubscriptionOrder(referenceId, model.PaymentProviderStripe, err.Error())
		common.ApiErrorMsg(c, err.Error())
		return
	}

	kind := stripeInvoiceKindSubscriptionPurchase
	description := fmt.Sprintf("Subscription plan: %s", plan.Title)
	itemDescription := description
	if purchaseMode == model.SubscriptionOrderModeSwitch {
		kind = stripeInvoiceKindSubscriptionSwitch
		description = fmt.Sprintf("Subscription switch difference: %s", plan.Title)
		itemDescription = description
	}
	metadata := stripeBaseMetadata(kind, user.Id)
	metadata[stripeMetadataOrderTradeNoKey] = referenceId
	metadata[stripeMetadataPlanIDKey] = plan.Id
	if order.FromSubscriptionId != "" {
		metadata[stripeMetadataFromSubscriptionIDKey] = order.FromSubscriptionId
	}

	session, err := createStripeInvoicePayment(c.Request.Context(), stripeInvoicePaymentInput{
		User:                   user,
		AmountCents:            amountCents,
		DisplayAmount:          order.Money,
		Currency:               stripeCurrency(),
		Description:            description,
		InvoiceItemDescription: itemDescription,
		Metadata:               metadata,
	})
	if err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("Stripe 订阅 Invoice 创建失败 trade_no=%s plan_id=%s error=%q", referenceId, plan.Id, err.Error()))
		_ = model.FailSubscriptionOrder(referenceId, model.PaymentProviderStripe, err.Error())
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "拉起支付失败"})
		return
	}
	_ = model.UpdateSubscriptionOrderStripeRefs(referenceId, session.InvoiceId, session.PaymentIntentId)

	c.JSON(http.StatusOK, gin.H{
		"message": "success",
		"data": gin.H{
			"publishable_key":                  session.PublishableKey,
			"client_secret":                    session.ClientSecret,
			"customer_session_client_secret":   session.CustomerSessionClientSecret,
			"invoice_id":                       session.InvoiceId,
			"invoice_number":                   session.InvoiceNumber,
			"payment_intent_id":                session.PaymentIntentId,
			"hosted_invoice_url":               session.HostedInvoiceURL,
			"invoice_pdf":                      session.InvoicePDF,
			"amount":                           session.Amount,
			"amount_cents":                     session.AmountCents,
			"currency":                         session.Currency,
			"trade_no":                         referenceId,
			"mode":                             purchaseMode,
			"from_subscription_id":             order.FromSubscriptionId,
			"plan_id":                          plan.Id,
			"stripe_payment_method_types_hint": []string{"card", "alipay", "wechat_pay"},
		},
	})
}
