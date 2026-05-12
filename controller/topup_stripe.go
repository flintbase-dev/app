package controller

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/logger"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting"
	"github.com/QuantumNous/new-api/setting/operation_setting"
	"github.com/QuantumNous/new-api/setting/system_setting"

	"github.com/gin-gonic/gin"
	"github.com/shopspring/decimal"
	"github.com/stripe/stripe-go/v85"
	billingportalsession "github.com/stripe/stripe-go/v85/billingportal/session"
	checkoutsession "github.com/stripe/stripe-go/v85/checkout/session"
	"github.com/stripe/stripe-go/v85/customer"
	"github.com/stripe/stripe-go/v85/invoice"
	"github.com/stripe/stripe-go/v85/webhook"
	"github.com/thanhpk/randstr"
)

const (
	stripeMetadataKindKey               = "new_api_kind"
	stripeMetadataUserIDKey             = "new_api_user_id"
	stripeMetadataPaymentOrderIDKey     = "new_api_payment_order_id"
	stripeMetadataTopupUnitsKey         = "new_api_topup_units"
	stripeMetadataCreditUnitsKey        = "new_api_credit_units"
	stripeMetadataOrderTradeNoKey       = "new_api_order_trade_no"
	stripeMetadataPlanIDKey             = "new_api_plan_id"
	stripeMetadataFromSubscriptionIDKey = "new_api_from_subscription_id"

	stripeInvoiceKindTopup                = model.StripePaymentOrderKindTopup
	stripeInvoiceKindSubscriptionPurchase = model.StripePaymentOrderKindSubscriptionPurchase
	stripeInvoiceKindSubscriptionSwitch   = model.StripePaymentOrderKindSubscriptionSwitch
)

var stripeAdaptor = &StripeAdaptor{}

func configureStripeClient() {
	stripe.Key = setting.StripeApiSecret
}

// StripePayRequest represents a Stripe Checkout Elements payment request.
type StripePayRequest struct {
	Amount        int64  `json:"amount"`
	PaymentMethod string `json:"payment_method"`
	ReturnURL     string `json:"return_url"`
}

type StripeAdaptor struct {
}

type stripeCheckoutPaymentInput struct {
	User                   *model.User
	AmountCents            int64
	DisplayAmount          float64
	Currency               string
	Description            string
	InvoiceItemDescription string
	Metadata               map[string]string
	ReturnURL              string
}

type stripeCheckoutPaymentSession struct {
	PublishableKey          string  `json:"publishable_key"`
	ClientSecret            string  `json:"client_secret"`
	PaymentOrderId          string  `json:"payment_order_id"`
	CheckoutSessionId       string  `json:"checkout_session_id"`
	CustomerId              string  `json:"customer_id,omitempty"`
	InvoiceId               string  `json:"invoice_id,omitempty"`
	InvoiceNumber           string  `json:"invoice_number,omitempty"`
	PaymentIntentId         string  `json:"payment_intent_id,omitempty"`
	HostedInvoiceURL        string  `json:"hosted_invoice_url,omitempty"`
	InvoicePDF              string  `json:"invoice_pdf,omitempty"`
	ReturnURL               string  `json:"return_url"`
	CustomerEmail           string  `json:"customer_email,omitempty"`
	RequiresCustomerDetails bool    `json:"requires_customer_details"`
	Amount                  float64 `json:"amount"`
	AmountCents             int64   `json:"amount_cents"`
	Currency                string  `json:"currency"`
}

type StripeInvoiceRecord struct {
	Id               string  `json:"id"`
	UserId           string  `json:"user_id"`
	Amount           int64   `json:"amount"`
	Money            float64 `json:"money"`
	TradeNo          string  `json:"trade_no"`
	InvoiceId        string  `json:"invoice_id"`
	InvoiceNumber    string  `json:"invoice_number"`
	PaymentMethod    string  `json:"payment_method"`
	PaymentProvider  string  `json:"payment_provider"`
	CreateTime       int64   `json:"create_time"`
	CompleteTime     int64   `json:"complete_time"`
	Status           string  `json:"status"`
	Kind             string  `json:"kind"`
	Currency         string  `json:"currency"`
	Description      string  `json:"description"`
	HostedInvoiceURL string  `json:"hosted_invoice_url"`
	InvoicePDF       string  `json:"invoice_pdf"`
	ReceiptURL       string  `json:"receipt_url"`
	CustomerId       string  `json:"customer_id"`
	CustomerEmail    string  `json:"customer_email"`
}

func (*StripeAdaptor) RequestAmount(c *gin.Context, req *StripePayRequest) {
	if req.Amount < getStripeMinTopup() {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": fmt.Sprintf("充值数量不能小于 %d", getStripeMinTopup())})
		return
	}
	id := c.GetString("id")
	group, err := model.GetUserGroup(id, true)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "获取用户分组失败"})
		return
	}
	payMoney := getStripePayMoney(float64(req.Amount), group)
	if payMoney <= 0.01 {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "充值金额过低"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "success", "data": strconv.FormatFloat(payMoney, 'f', 2, 64)})
}

func (*StripeAdaptor) RequestPay(c *gin.Context, req *StripePayRequest) {
	if req.PaymentMethod != model.PaymentMethodStripe {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "不支持的支付渠道"})
		return
	}
	if err := validateStripeCheckoutPaymentConfig(); err != nil {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": err.Error()})
		return
	}
	if req.Amount < getStripeMinTopup() {
		c.JSON(http.StatusOK, gin.H{"message": fmt.Sprintf("充值数量不能小于 %d", getStripeMinTopup()), "data": 10})
		return
	}
	if req.Amount > 10000 {
		c.JSON(http.StatusOK, gin.H{"message": "充值数量不能大于 10000", "data": 10})
		return
	}
	returnURL, err := normalizeStripeReturnURL(req.ReturnURL)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": err.Error()})
		return
	}

	id := c.GetString("id")
	user, err := model.GetUserById(id, false)
	if err != nil || user == nil {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "用户不存在"})
		return
	}

	creditUnits := GetChargedAmount(float64(req.Amount), *user)
	payMoney := getStripePayMoney(float64(req.Amount), user.Group)
	amountCents, err := moneyToStripeAmountCents(payMoney)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": err.Error()})
		return
	}

	paymentOrder, err := model.CreatePendingStripePaymentOrder(model.CreatePendingStripePaymentOrderParams{
		UserId:          user.Id,
		Kind:            stripeInvoiceKindTopup,
		AmountCents:     amountCents,
		DisplayAmount:   payMoney,
		Currency:        stripeCurrency(),
		CreditUnits:     creditUnits,
		TopUpUnits:      req.Amount,
		PaymentMethod:   model.PaymentMethodStripe,
		PaymentProvider: model.PaymentProviderStripe,
	})
	if err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("Stripe 创建本地充值订单失败 user_id=%s amount=%d error=%q", id, req.Amount, err.Error()))
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "创建支付订单失败"})
		return
	}

	metadata := stripeBaseMetadata(stripeInvoiceKindTopup, user.Id)
	metadata[stripeMetadataPaymentOrderIDKey] = paymentOrder.Id
	metadata[stripeMetadataTopupUnitsKey] = strconv.FormatInt(req.Amount, 10)
	metadata[stripeMetadataCreditUnitsKey] = strconv.FormatFloat(creditUnits, 'f', 6, 64)

	session, err := createStripeCheckoutPayment(c.Request.Context(), stripeCheckoutPaymentInput{
		User:                   user,
		AmountCents:            amountCents,
		DisplayAmount:          payMoney,
		Currency:               stripeCurrency(),
		Description:            fmt.Sprintf("Wallet top up %d", req.Amount),
		InvoiceItemDescription: fmt.Sprintf("Wallet credits: %d units", req.Amount),
		Metadata:               metadata,
		ReturnURL:              returnURL,
	})
	if err != nil {
		_ = model.FailStripePaymentOrder(paymentOrder.Id, err.Error())
		logger.LogError(c.Request.Context(), fmt.Sprintf("Stripe 创建 Checkout Session 充值失败 user_id=%s amount=%d error=%q", id, req.Amount, err.Error()))
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "拉起支付失败"})
		return
	}
	session.PaymentOrderId = paymentOrder.Id
	_ = model.UpdateStripePaymentOrderCheckoutRefs(paymentOrder.Id, session.CheckoutSessionId, session.InvoiceId, session.PaymentIntentId)

	logger.LogInfo(c.Request.Context(), fmt.Sprintf("Stripe Checkout Session 充值创建成功 user_id=%s payment_order_id=%s checkout_session_id=%s amount=%d money=%.2f", id, paymentOrder.Id, session.CheckoutSessionId, req.Amount, payMoney))
	c.JSON(http.StatusOK, gin.H{
		"message": "success",
		"data":    session,
	})
}

func RequestStripeAmount(c *gin.Context) {
	var req StripePayRequest
	err := c.ShouldBindJSON(&req)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "参数错误"})
		return
	}
	stripeAdaptor.RequestAmount(c, &req)
}

func RequestStripePay(c *gin.Context) {
	var req StripePayRequest
	err := c.ShouldBindJSON(&req)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "参数错误"})
		return
	}
	stripeAdaptor.RequestPay(c, &req)
}

func StripeWebhook(c *gin.Context) {
	ctx := c.Request.Context()
	if !isStripeWebhookEnabled() {
		logger.LogWarn(ctx, fmt.Sprintf("Stripe webhook 被拒绝 reason=webhook_disabled path=%q client_ip=%s", c.Request.RequestURI, c.ClientIP()))
		model.RecordSecurityEventWithContext(c, model.LogEventParams{
			Event:        "security.stripe_webhook.rejected",
			Severity:     "warning",
			Result:       "rejected",
			Content:      "Stripe webhook disabled",
			ResourceType: "stripe_webhook",
		})
		c.AbortWithStatus(http.StatusForbidden)
		return
	}

	payload, err := io.ReadAll(c.Request.Body)
	if err != nil {
		logger.LogError(ctx, fmt.Sprintf("Stripe webhook 读取请求体失败 path=%q client_ip=%s error=%q", c.Request.RequestURI, c.ClientIP(), err.Error()))
		c.AbortWithStatus(http.StatusServiceUnavailable)
		return
	}

	signature := c.GetHeader("Stripe-Signature")
	configureStripeClient()
	event, err := webhook.ConstructEventWithOptions(payload, signature, setting.StripeWebhookSecret, webhook.ConstructEventOptions{
		IgnoreAPIVersionMismatch: true,
	})
	if err != nil {
		logger.LogWarn(ctx, fmt.Sprintf("Stripe webhook 验签失败 path=%q client_ip=%s error=%q", c.Request.RequestURI, c.ClientIP(), err.Error()))
		model.RecordSecurityEventWithContext(c, model.LogEventParams{
			Event:        "security.stripe_webhook.signature_failed",
			Severity:     "warning",
			Result:       "failed",
			Content:      "Stripe webhook signature verification failed",
			ResourceType: "stripe_webhook",
			Other: map[string]interface{}{
				"body_size": len(payload),
			},
		})
		c.AbortWithStatus(http.StatusBadRequest)
		return
	}

	callerIp := c.ClientIP()
	logger.LogInfo(ctx, fmt.Sprintf("Stripe webhook 验签成功 event_type=%s client_ip=%s path=%q", string(event.Type), callerIp, c.Request.RequestURI))
	var handleErr error
	switch event.Type {
	case stripe.EventTypeCheckoutSessionCompleted, stripe.EventTypeCheckoutSessionAsyncPaymentSucceeded:
		handleErr = handleStripeCheckoutSessionPaid(ctx, event, callerIp)
	case stripe.EventTypeCheckoutSessionAsyncPaymentFailed:
		handleErr = handleStripeCheckoutSessionFailed(ctx, event, callerIp)
	case stripe.EventTypeCheckoutSessionExpired:
		handleErr = handleStripeCheckoutSessionExpired(ctx, event, callerIp)
	case stripe.EventTypeInvoicePaymentSucceeded, stripe.EventTypeInvoicePaid:
		handleErr = handleStripeInvoicePaid(ctx, event, callerIp)
	case stripe.EventTypeInvoicePaymentFailed:
		handleErr = handleStripeInvoicePaymentFailed(ctx, event, callerIp)
	case stripe.EventTypeInvoiceVoided, stripe.EventTypeInvoiceMarkedUncollectible:
		handleErr = handleStripeInvoiceClosed(ctx, event, callerIp)
	default:
		logger.LogInfo(ctx, fmt.Sprintf("Stripe webhook 忽略事件 event_type=%s client_ip=%s", string(event.Type), callerIp))
	}
	if handleErr != nil {
		logger.LogError(ctx, fmt.Sprintf("Stripe webhook 处理失败 event_type=%s event_id=%s client_ip=%s error=%q", string(event.Type), event.ID, callerIp, handleErr.Error()))
		c.AbortWithStatus(http.StatusServiceUnavailable)
		return
	}

	c.Status(http.StatusOK)
}

func handleStripeInvoicePaid(ctx context.Context, event stripe.Event, callerIp string) error {
	inv, err := stripeInvoiceFromEvent(event)
	if err != nil {
		logger.LogError(ctx, fmt.Sprintf("Stripe invoice paid 解析失败 event_id=%s error=%q", event.ID, err.Error()))
		return nil
	}
	if inv.ID == "" {
		logger.LogWarn(ctx, fmt.Sprintf("Stripe invoice paid 缺少 invoice_id event_id=%s", event.ID))
		return nil
	}
	inv = retrieveStripeInvoiceForFulfillment(ctx, inv)
	if inv == nil {
		return nil
	}
	kind := inv.Metadata[stripeMetadataKindKey]
	if kind == "" {
		logger.LogInfo(ctx, fmt.Sprintf("Stripe invoice paid 忽略非系统发票 invoice_id=%s", inv.ID))
		return nil
	}
	if inv.Status != stripe.InvoiceStatusPaid {
		logger.LogInfo(ctx, fmt.Sprintf("Stripe invoice paid 状态未 paid invoice_id=%s status=%s", inv.ID, inv.Status))
		return nil
	}

	LockOrder(inv.ID)
	defer UnlockOrder(inv.ID)

	switch kind {
	case stripeInvoiceKindTopup:
		return fulfillStripeInvoiceTopup(ctx, inv, callerIp)
	case stripeInvoiceKindSubscriptionPurchase, stripeInvoiceKindSubscriptionSwitch:
		return fulfillStripeInvoiceSubscription(ctx, inv, callerIp)
	default:
		logger.LogInfo(ctx, fmt.Sprintf("Stripe invoice paid 忽略未知业务类型 invoice_id=%s kind=%s", inv.ID, kind))
	}
	return nil
}

func handleStripeInvoicePaymentFailed(ctx context.Context, event stripe.Event, callerIp string) error {
	inv, err := stripeInvoiceFromEvent(event)
	if err != nil {
		logger.LogError(ctx, fmt.Sprintf("Stripe invoice failed 解析失败 event_id=%s error=%q", event.ID, err.Error()))
		return nil
	}
	if inv.ID == "" {
		return nil
	}
	kind := inv.Metadata[stripeMetadataKindKey]
	tradeNo := inv.Metadata[stripeMetadataOrderTradeNoKey]
	paymentOrderId := stripeInvoicePaymentOrderID(inv)
	payload := stripeInvoicePayload(inv, string(event.Type))
	if err := model.FailStripePaymentOrder(paymentOrderId, common.GetJsonString(payload)); err != nil && !errors.Is(err, model.ErrStripePaymentOrderNotFound) {
		logger.LogError(ctx, fmt.Sprintf("Stripe 本地支付订单失败状态更新失败 invoice_id=%s payment_order_id=%s client_ip=%s error=%q", inv.ID, paymentOrderId, callerIp, err.Error()))
		return err
	}
	if kind == stripeInvoiceKindSubscriptionPurchase || kind == stripeInvoiceKindSubscriptionSwitch {
		if err := model.FailSubscriptionOrder(tradeNo, model.PaymentProviderStripe, common.GetJsonString(payload)); err != nil && !errors.Is(err, model.ErrSubscriptionOrderNotFound) {
			logger.LogError(ctx, fmt.Sprintf("Stripe 订阅订单失败状态更新失败 invoice_id=%s trade_no=%s client_ip=%s error=%q", inv.ID, tradeNo, callerIp, err.Error()))
			return err
		}
		logger.LogInfo(ctx, fmt.Sprintf("Stripe 订阅订单已标记失败 invoice_id=%s trade_no=%s client_ip=%s", inv.ID, tradeNo, callerIp))
	}
	return nil
}

func handleStripeInvoiceClosed(ctx context.Context, event stripe.Event, callerIp string) error {
	inv, err := stripeInvoiceFromEvent(event)
	if err != nil || inv.ID == "" {
		return nil
	}
	kind := inv.Metadata[stripeMetadataKindKey]
	tradeNo := inv.Metadata[stripeMetadataOrderTradeNoKey]
	paymentOrderId := stripeInvoicePaymentOrderID(inv)
	if err := model.ExpireStripePaymentOrder(paymentOrderId); err != nil && !errors.Is(err, model.ErrStripePaymentOrderNotFound) {
		logger.LogError(ctx, fmt.Sprintf("Stripe 本地支付订单关闭处理失败 invoice_id=%s payment_order_id=%s client_ip=%s error=%q", inv.ID, paymentOrderId, callerIp, err.Error()))
		return err
	}
	if kind == stripeInvoiceKindSubscriptionPurchase || kind == stripeInvoiceKindSubscriptionSwitch {
		if err := model.ExpireSubscriptionOrder(tradeNo, model.PaymentProviderStripe); err != nil && !errors.Is(err, model.ErrSubscriptionOrderNotFound) {
			logger.LogError(ctx, fmt.Sprintf("Stripe 订阅订单关闭处理失败 invoice_id=%s trade_no=%s client_ip=%s error=%q", inv.ID, tradeNo, callerIp, err.Error()))
			return err
		}
		logger.LogInfo(ctx, fmt.Sprintf("Stripe 订阅订单已关闭 invoice_id=%s trade_no=%s client_ip=%s", inv.ID, tradeNo, callerIp))
	}
	return nil
}

func handleStripeCheckoutSessionPaid(ctx context.Context, event stripe.Event, callerIp string) error {
	session, err := stripeCheckoutSessionFromEvent(event)
	if err != nil {
		logger.LogError(ctx, fmt.Sprintf("Stripe checkout session 解析失败 event_id=%s error=%q", event.ID, err.Error()))
		return nil
	}
	if session.ID == "" {
		logger.LogWarn(ctx, fmt.Sprintf("Stripe checkout session 缺少 session_id event_id=%s", event.ID))
		return nil
	}
	session = retrieveStripeCheckoutSessionForFulfillment(ctx, session)
	if session == nil {
		return nil
	}
	kind := session.Metadata[stripeMetadataKindKey]
	if kind == "" {
		logger.LogInfo(ctx, fmt.Sprintf("Stripe checkout session paid 忽略非系统会话 session_id=%s", session.ID))
		return nil
	}
	if session.PaymentStatus != stripe.CheckoutSessionPaymentStatusPaid && session.PaymentStatus != stripe.CheckoutSessionPaymentStatusNoPaymentRequired {
		logger.LogInfo(ctx, fmt.Sprintf("Stripe checkout session paid 状态未 paid session_id=%s payment_status=%s", session.ID, session.PaymentStatus))
		return nil
	}

	LockOrder(session.ID)
	defer UnlockOrder(session.ID)

	switch kind {
	case stripeInvoiceKindTopup:
		return fulfillStripeCheckoutSessionTopup(ctx, session, callerIp)
	case stripeInvoiceKindSubscriptionPurchase, stripeInvoiceKindSubscriptionSwitch:
		return fulfillStripeCheckoutSessionSubscription(ctx, session, callerIp)
	default:
		logger.LogInfo(ctx, fmt.Sprintf("Stripe checkout session paid 忽略未知业务类型 session_id=%s kind=%s", session.ID, kind))
	}
	return nil
}

func handleStripeCheckoutSessionFailed(ctx context.Context, event stripe.Event, callerIp string) error {
	session, err := stripeCheckoutSessionFromEvent(event)
	if err != nil || session.ID == "" {
		return nil
	}
	kind := session.Metadata[stripeMetadataKindKey]
	tradeNo := session.Metadata[stripeMetadataOrderTradeNoKey]
	paymentOrderId := stripeCheckoutSessionPaymentOrderID(session)
	payload := stripeCheckoutSessionPayload(session, string(event.Type))
	if err := model.FailStripePaymentOrder(paymentOrderId, common.GetJsonString(payload)); err != nil && !errors.Is(err, model.ErrStripePaymentOrderNotFound) {
		logger.LogError(ctx, fmt.Sprintf("Stripe checkout session 本地支付订单失败状态更新失败 session_id=%s payment_order_id=%s client_ip=%s error=%q", session.ID, paymentOrderId, callerIp, err.Error()))
		return err
	}
	if kind == stripeInvoiceKindSubscriptionPurchase || kind == stripeInvoiceKindSubscriptionSwitch {
		if err := model.FailSubscriptionOrder(tradeNo, model.PaymentProviderStripe, common.GetJsonString(payload)); err != nil && !errors.Is(err, model.ErrSubscriptionOrderNotFound) {
			logger.LogError(ctx, fmt.Sprintf("Stripe checkout session 订阅失败状态更新失败 session_id=%s trade_no=%s client_ip=%s error=%q", session.ID, tradeNo, callerIp, err.Error()))
			return err
		}
		logger.LogInfo(ctx, fmt.Sprintf("Stripe checkout session 订阅订单已标记失败 session_id=%s trade_no=%s client_ip=%s", session.ID, tradeNo, callerIp))
	}
	return nil
}

func handleStripeCheckoutSessionExpired(ctx context.Context, event stripe.Event, callerIp string) error {
	session, err := stripeCheckoutSessionFromEvent(event)
	if err != nil || session.ID == "" {
		return nil
	}
	kind := session.Metadata[stripeMetadataKindKey]
	tradeNo := session.Metadata[stripeMetadataOrderTradeNoKey]
	paymentOrderId := stripeCheckoutSessionPaymentOrderID(session)
	if err := model.ExpireStripePaymentOrder(paymentOrderId); err != nil && !errors.Is(err, model.ErrStripePaymentOrderNotFound) {
		logger.LogError(ctx, fmt.Sprintf("Stripe checkout session 本地支付订单过期处理失败 session_id=%s payment_order_id=%s client_ip=%s error=%q", session.ID, paymentOrderId, callerIp, err.Error()))
		return err
	}
	if kind == stripeInvoiceKindSubscriptionPurchase || kind == stripeInvoiceKindSubscriptionSwitch {
		if err := model.ExpireSubscriptionOrder(tradeNo, model.PaymentProviderStripe); err != nil && !errors.Is(err, model.ErrSubscriptionOrderNotFound) {
			logger.LogError(ctx, fmt.Sprintf("Stripe checkout session 订阅订单过期处理失败 session_id=%s trade_no=%s client_ip=%s error=%q", session.ID, tradeNo, callerIp, err.Error()))
			return err
		}
		logger.LogInfo(ctx, fmt.Sprintf("Stripe checkout session 订阅订单已过期 session_id=%s trade_no=%s client_ip=%s", session.ID, tradeNo, callerIp))
	}
	return nil
}

func fulfillStripeCheckoutSessionTopup(ctx context.Context, session *stripe.CheckoutSession, callerIp string) error {
	userId := session.Metadata[stripeMetadataUserIDKey]
	creditUnits, err := strconv.ParseFloat(session.Metadata[stripeMetadataCreditUnitsKey], 64)
	if err != nil || creditUnits <= 0 {
		logger.LogError(ctx, fmt.Sprintf("Stripe checkout session 充值元数据无效 session_id=%s user_id=%s credit_units=%q", session.ID, userId, session.Metadata[stripeMetadataCreditUnitsKey]))
		return nil
	}
	invoiceId := stripeCheckoutSessionInvoiceID(session)
	if invoiceId == "" {
		logger.LogWarn(ctx, fmt.Sprintf("Stripe checkout session 充值尚未绑定 invoice，等待 invoice webhook session_id=%s payment_order_id=%s", session.ID, stripeCheckoutSessionPaymentOrderID(session)))
		return nil
	}
	topupUnits, _ := strconv.ParseInt(session.Metadata[stripeMetadataTopupUnitsKey], 10, 64)
	paymentOrderId := stripeCheckoutSessionPaymentOrderID(session)
	payload := stripeCheckoutSessionPayload(session, "checkout.session.completed")
	created, err := model.CompleteStripeInvoiceTopUp(model.StripeInvoiceTopUpParams{
		PaymentOrderId:    paymentOrderId,
		UserId:            userId,
		InvoiceId:         invoiceId,
		StripeInvoiceId:   invoiceId,
		CheckoutSessionId: session.ID,
		PaymentIntentId:   stripeCheckoutSessionPaymentIntentID(session),
		CustomerId:        stripeCheckoutSessionCustomerID(session),
		PaymentMethod:     stripeCheckoutSessionPaymentMethod(session),
		ProviderPayload:   common.GetJsonString(payload),
		CreditUnits:       creditUnits,
		TopUpUnits:        topupUnits,
		PaidAmount:        centsToMoney(session.AmountTotal),
		Currency:          string(session.Currency),
		CallerIp:          callerIp,
	})
	if err != nil {
		logger.LogError(ctx, fmt.Sprintf("Stripe checkout session 充值处理失败 session_id=%s payment_order_id=%s invoice_id=%s user_id=%s client_ip=%s error=%q", session.ID, paymentOrderId, invoiceId, userId, callerIp, err.Error()))
		return err
	}
	if !created {
		logger.LogInfo(ctx, fmt.Sprintf("Stripe checkout session 充值已处理，跳过重复履约 session_id=%s payment_order_id=%s invoice_id=%s user_id=%s client_ip=%s", session.ID, paymentOrderId, invoiceId, userId, callerIp))
		return nil
	}
	logger.LogInfo(ctx, fmt.Sprintf("Stripe checkout session 充值成功 session_id=%s payment_order_id=%s invoice_id=%s user_id=%s amount_paid=%.2f currency=%s client_ip=%s", session.ID, paymentOrderId, invoiceId, userId, centsToMoney(session.AmountTotal), strings.ToUpper(string(session.Currency)), callerIp))
	return nil
}

func fulfillStripeCheckoutSessionSubscription(ctx context.Context, session *stripe.CheckoutSession, callerIp string) error {
	tradeNo := session.Metadata[stripeMetadataOrderTradeNoKey]
	if tradeNo == "" {
		logger.LogWarn(ctx, fmt.Sprintf("Stripe checkout session 订阅支付缺少订单号 session_id=%s client_ip=%s", session.ID, callerIp))
		return nil
	}
	invoiceId := stripeCheckoutSessionInvoiceID(session)
	if invoiceId == "" {
		logger.LogWarn(ctx, fmt.Sprintf("Stripe checkout session 订阅尚未绑定 invoice，等待 invoice webhook session_id=%s trade_no=%s payment_order_id=%s", session.ID, tradeNo, stripeCheckoutSessionPaymentOrderID(session)))
		return nil
	}
	payload := stripeCheckoutSessionPayload(session, "checkout.session.completed")
	actualPaymentMethod := stripeCheckoutSessionPaymentMethod(session)
	if err := model.CompleteSubscriptionOrder(model.CompleteSubscriptionOrderParams{
		TradeNo:                 tradeNo,
		ProviderPayload:         common.GetJsonString(payload),
		ExpectedPaymentProvider: model.PaymentProviderStripe,
		ActualPaymentMethod:     actualPaymentMethod,
		StripePaymentOrderId:    stripeCheckoutSessionPaymentOrderID(session),
		StripeCheckoutSessionId: session.ID,
		StripeInvoiceId:         invoiceId,
		StripePaymentIntentId:   stripeCheckoutSessionPaymentIntentID(session),
		StripeCustomerId:        stripeCheckoutSessionCustomerID(session),
	}); err != nil {
		logger.LogError(ctx, fmt.Sprintf("Stripe checkout session 订阅订单处理失败 session_id=%s trade_no=%s client_ip=%s error=%q", session.ID, tradeNo, callerIp, err.Error()))
		return err
	}
	logger.LogInfo(ctx, fmt.Sprintf("Stripe checkout session 订阅订单处理成功 session_id=%s trade_no=%s client_ip=%s", session.ID, tradeNo, callerIp))
	return nil
}

func fulfillStripeInvoiceTopup(ctx context.Context, inv *stripe.Invoice, callerIp string) error {
	userId := inv.Metadata[stripeMetadataUserIDKey]
	creditUnits, err := strconv.ParseFloat(inv.Metadata[stripeMetadataCreditUnitsKey], 64)
	if err != nil || creditUnits <= 0 {
		logger.LogError(ctx, fmt.Sprintf("Stripe Invoice 充值元数据无效 invoice_id=%s user_id=%s credit_units=%q", inv.ID, userId, inv.Metadata[stripeMetadataCreditUnitsKey]))
		return nil
	}
	topupUnits, _ := strconv.ParseInt(inv.Metadata[stripeMetadataTopupUnitsKey], 10, 64)
	paymentMethod := stripeInvoicePaymentMethod(inv)
	customerId := stripeInvoiceCustomerID(inv)
	paymentOrderId := stripeInvoicePaymentOrderID(inv)
	payload := stripeInvoicePayload(inv, "invoice.payment_succeeded")
	created, err := model.CompleteStripeInvoiceTopUp(model.StripeInvoiceTopUpParams{
		PaymentOrderId:  paymentOrderId,
		UserId:          userId,
		InvoiceId:       inv.ID,
		StripeInvoiceId: inv.ID,
		PaymentIntentId: stripeInvoicePaymentIntentID(inv),
		CustomerId:      customerId,
		PaymentMethod:   paymentMethod,
		ProviderPayload: common.GetJsonString(payload),
		CreditUnits:     creditUnits,
		TopUpUnits:      topupUnits,
		PaidAmount:      centsToMoney(inv.AmountPaid),
		Currency:        string(inv.Currency),
		CallerIp:        callerIp,
	})
	if err != nil {
		logger.LogError(ctx, fmt.Sprintf("Stripe Invoice 充值处理失败 invoice_id=%s payment_order_id=%s user_id=%s client_ip=%s error=%q", inv.ID, paymentOrderId, userId, callerIp, err.Error()))
		return err
	}
	if !created {
		logger.LogInfo(ctx, fmt.Sprintf("Stripe Invoice 充值已处理，跳过重复履约 invoice_id=%s payment_order_id=%s user_id=%s client_ip=%s", inv.ID, paymentOrderId, userId, callerIp))
		return nil
	}
	logger.LogInfo(ctx, fmt.Sprintf("Stripe Invoice 充值成功 invoice_id=%s payment_order_id=%s user_id=%s amount_paid=%.2f currency=%s client_ip=%s", inv.ID, paymentOrderId, userId, centsToMoney(inv.AmountPaid), strings.ToUpper(string(inv.Currency)), callerIp))
	return nil
}

func fulfillStripeInvoiceSubscription(ctx context.Context, inv *stripe.Invoice, callerIp string) error {
	tradeNo := inv.Metadata[stripeMetadataOrderTradeNoKey]
	if tradeNo == "" {
		logger.LogWarn(ctx, fmt.Sprintf("Stripe Invoice 订阅支付缺少订单号 invoice_id=%s client_ip=%s", inv.ID, callerIp))
		return nil
	}
	payload := stripeInvoicePayload(inv, "invoice.payment_succeeded")
	actualPaymentMethod := stripeInvoicePaymentMethod(inv)
	if err := model.CompleteSubscriptionOrder(model.CompleteSubscriptionOrderParams{
		TradeNo:                 tradeNo,
		ProviderPayload:         common.GetJsonString(payload),
		ExpectedPaymentProvider: model.PaymentProviderStripe,
		ActualPaymentMethod:     actualPaymentMethod,
		StripePaymentOrderId:    stripeInvoicePaymentOrderID(inv),
		StripeInvoiceId:         inv.ID,
		StripePaymentIntentId:   stripeInvoicePaymentIntentID(inv),
		StripeCustomerId:        stripeInvoiceCustomerID(inv),
	}); err != nil {
		logger.LogError(ctx, fmt.Sprintf("Stripe Invoice 订阅订单处理失败 invoice_id=%s trade_no=%s client_ip=%s error=%q", inv.ID, tradeNo, callerIp, err.Error()))
		return err
	}
	logger.LogInfo(ctx, fmt.Sprintf("Stripe Invoice 订阅订单处理成功 invoice_id=%s trade_no=%s client_ip=%s", inv.ID, tradeNo, callerIp))
	return nil
}

func createStripeCheckoutPayment(ctx context.Context, input stripeCheckoutPaymentInput) (*stripeCheckoutPaymentSession, error) {
	if input.User == nil {
		return nil, errors.New("用户不存在")
	}
	if err := validateStripeCheckoutPaymentConfig(); err != nil {
		return nil, err
	}
	if input.AmountCents <= 0 {
		return nil, errors.New("支付金额过低")
	}
	returnURL, err := normalizeStripeReturnURL(input.ReturnURL)
	if err != nil {
		return nil, err
	}
	configureStripeClient()

	metadata := cloneStringMap(input.Metadata)
	metadata[stripeMetadataUserIDKey] = input.User.Id
	customerState, err := resolveStripeCheckoutCustomer(ctx, input.User)
	if err != nil {
		return nil, err
	}

	params := &stripe.CheckoutSessionParams{
		AllowPromotionCodes:      stripe.Bool(setting.StripePromotionCodesEnabled),
		BillingAddressCollection: stripe.String(string(stripe.CheckoutSessionBillingAddressCollectionAuto)),
		ClientReferenceID:        stripe.String(stripeCheckoutReferenceID(metadata)),
		Customer:                 stripe.String(customerState.CustomerId),
		CustomerUpdate: &stripe.CheckoutSessionCustomerUpdateParams{
			Address: stripe.String("auto"),
			Name:    stripe.String("auto"),
		},
		Mode:      stripe.String(string(stripe.CheckoutSessionModePayment)),
		Metadata:  metadata,
		ReturnURL: stripe.String(returnURL),
		UIMode:    stripe.String(string(stripe.CheckoutSessionUIModeElements)),
		LineItems: []*stripe.CheckoutSessionLineItemParams{
			{
				PriceData: &stripe.CheckoutSessionLineItemPriceDataParams{
					Currency: stripe.String(input.Currency),
					ProductData: &stripe.CheckoutSessionLineItemPriceDataProductDataParams{
						Name:        stripe.String(input.InvoiceItemDescription),
						Description: stripe.String(input.Description),
						Metadata:    metadata,
					},
					UnitAmount: stripe.Int64(input.AmountCents),
				},
				Quantity: stripe.Int64(1),
			},
		},
		PaymentIntentData: &stripe.CheckoutSessionPaymentIntentDataParams{
			Description: stripe.String(input.Description),
			Metadata:    metadata,
		},
		InvoiceCreation: &stripe.CheckoutSessionInvoiceCreationParams{
			Enabled: stripe.Bool(true),
			InvoiceData: &stripe.CheckoutSessionInvoiceCreationInvoiceDataParams{
				Description: stripe.String(input.Description),
				Metadata:    metadata,
			},
		},
	}
	if customerState.RequiresCustomerDetails {
		params.BillingAddressCollection = stripe.String(string(stripe.CheckoutSessionBillingAddressCollectionRequired))
	}
	params.AddExpand("payment_intent")
	params.AddExpand("invoice")

	session, err := checkoutsession.New(params)
	if err != nil {
		return nil, err
	}
	if session.ClientSecret == "" {
		return nil, errors.New("Stripe Checkout Session 未返回 client_secret")
	}
	return &stripeCheckoutPaymentSession{
		PublishableKey:          setting.StripePublishableKey,
		ClientSecret:            session.ClientSecret,
		PaymentOrderId:          metadata[stripeMetadataPaymentOrderIDKey],
		CheckoutSessionId:       session.ID,
		CustomerId:              customerState.CustomerId,
		InvoiceId:               stripeCheckoutSessionInvoiceID(session),
		InvoiceNumber:           stripeCheckoutSessionInvoiceNumber(session),
		PaymentIntentId:         stripeCheckoutSessionPaymentIntentID(session),
		HostedInvoiceURL:        stripeCheckoutSessionHostedInvoiceURL(session),
		InvoicePDF:              stripeCheckoutSessionInvoicePDF(session),
		ReturnURL:               returnURL,
		CustomerEmail:           customerState.CustomerEmail,
		RequiresCustomerDetails: customerState.RequiresCustomerDetails,
		Amount:                  input.DisplayAmount,
		AmountCents:             input.AmountCents,
		Currency:                strings.ToUpper(input.Currency),
	}, nil
}

type stripeCheckoutCustomerState struct {
	CustomerId              string
	CustomerEmail           string
	RequiresCustomerDetails bool
}

func resolveStripeCheckoutCustomer(ctx context.Context, user *model.User) (stripeCheckoutCustomerState, error) {
	customerId, err := ensureStripeCustomer(ctx, user)
	if err != nil {
		return stripeCheckoutCustomerState{}, err
	}
	cus, err := customer.Get(customerId, nil)
	if err != nil {
		return stripeCheckoutCustomerState{}, err
	}
	if cus == nil || cus.Deleted {
		return stripeCheckoutCustomerState{}, errors.New("Stripe Customer 不存在")
	}
	return stripeCheckoutCustomerState{
		CustomerId:              cus.ID,
		CustomerEmail:           firstNonEmptyString(cus.Email, user.Email),
		RequiresCustomerDetails: stripeCustomerRequiresCheckoutDetails(cus),
	}, nil
}

func stripeCustomerRequiresCheckoutDetails(cus *stripe.Customer) bool {
	if cus == nil {
		return true
	}
	if strings.TrimSpace(cus.Email) == "" {
		return true
	}
	if strings.TrimSpace(cus.Name) == "" && strings.TrimSpace(cus.IndividualName) == "" && strings.TrimSpace(cus.BusinessName) == "" {
		return true
	}
	return !stripeCustomerHasBillingAddress(cus.Address)
}

func stripeCustomerHasBillingAddress(address *stripe.Address) bool {
	return address != nil &&
		strings.TrimSpace(address.Country) != "" &&
		strings.TrimSpace(address.Line1) != ""
}

func firstNonEmptyString(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return strings.TrimSpace(value)
		}
	}
	return ""
}

func ensureStripeCustomer(ctx context.Context, user *model.User) (string, error) {
	if user == nil {
		return "", errors.New("用户不存在")
	}
	configureStripeClient()
	if strings.TrimSpace(user.StripeCustomer) != "" {
		return user.StripeCustomer, nil
	}
	params := &stripe.CustomerParams{
		Email: stripe.String(user.Email),
		Metadata: map[string]string{
			stripeMetadataUserIDKey: user.Id,
			"new_api_username":      user.Username,
		},
	}
	if user.DisplayName != "" {
		params.Name = stripe.String(user.DisplayName)
	} else if user.Username != "" {
		params.Name = stripe.String(user.Username)
	}
	cus, err := customer.New(params)
	if err != nil {
		return "", err
	}
	if err := model.DB.Model(&model.User{}).Where("id = ?", user.Id).Update("stripe_customer", cus.ID).Error; err != nil {
		logger.LogWarn(ctx, fmt.Sprintf("Stripe Customer 已创建但本地保存失败 user_id=%s customer_id=%s error=%q", user.Id, cus.ID, err.Error()))
		return "", err
	}
	user.StripeCustomer = cus.ID
	return cus.ID, nil
}

func validateStripeAPIConfig() error {
	if !strings.HasPrefix(setting.StripeApiSecret, "sk_") && !strings.HasPrefix(setting.StripeApiSecret, "rk_") {
		return errors.New("Stripe 未配置或密钥无效")
	}
	return nil
}

func validateStripePublishableKeyConfig() error {
	if !strings.HasPrefix(setting.StripePublishableKey, "pk_") {
		return errors.New("Stripe Publishable Key 未配置或无效")
	}
	return nil
}

func validateStripeWebhookConfig() error {
	if strings.TrimSpace(setting.StripeWebhookSecret) == "" {
		return errors.New("Stripe Webhook 未配置")
	}
	return nil
}

func validateStripeCheckoutPaymentConfig() error {
	if err := validateStripeAPIConfig(); err != nil {
		return err
	}
	if err := validateStripePublishableKeyConfig(); err != nil {
		return err
	}
	return validateStripeWebhookConfig()
}

func normalizeStripeReturnURL(raw string) (string, error) {
	value := strings.TrimSpace(raw)
	if value == "" {
		return "", errors.New("Stripe return_url 未配置")
	}
	parsed, err := url.Parse(value)
	if err != nil || parsed.Scheme == "" || parsed.Host == "" {
		return "", errors.New("Stripe return_url 必须是完整 URL")
	}
	if parsed.Scheme != "https" && parsed.Scheme != "http" {
		return "", errors.New("Stripe return_url 仅支持 http 或 https")
	}
	return parsed.String(), nil
}

func stripeCheckoutReferenceID(metadata map[string]string) string {
	for _, key := range []string{stripeMetadataPaymentOrderIDKey, stripeMetadataOrderTradeNoKey} {
		if value := strings.TrimSpace(metadata[key]); value != "" {
			return value
		}
	}
	return "stripe_checkout_" + common.Sha1([]byte(fmt.Sprintf("%d-%s", time.Now().UnixNano(), randstr.String(8))))
}

func stripeBaseMetadata(kind string, userId string) map[string]string {
	return map[string]string{
		stripeMetadataKindKey:   kind,
		stripeMetadataUserIDKey: userId,
		"new_api_version":       common.Version,
	}
}

func cloneStringMap(src map[string]string) map[string]string {
	dst := make(map[string]string, len(src))
	for k, v := range src {
		dst[k] = v
	}
	return dst
}

func moneyToStripeAmountCents(amount float64) (int64, error) {
	cents := decimal.NewFromFloat(amount).Mul(decimal.NewFromInt(100)).Round(0).IntPart()
	if cents <= 0 {
		return 0, errors.New("支付金额过低")
	}
	return cents, nil
}

func centsToMoney(cents int64) float64 {
	value, _ := decimal.NewFromInt(cents).Div(decimal.NewFromInt(100)).Float64()
	return value
}

func stripeCurrency() string {
	if operation_setting.GetQuotaDisplayType() == operation_setting.QuotaDisplayTypeCNY {
		return "cny"
	}
	return "usd"
}

func GetChargedAmount(count float64, user model.User) float64 {
	topUpGroupRatio := common.GetTopupGroupRatio(user.Group)
	if topUpGroupRatio == 0 {
		topUpGroupRatio = 1
	}

	return count * topUpGroupRatio
}

func getStripePayMoney(amount float64, group string) float64 {
	originalAmount := amount
	topupGroupRatio := common.GetTopupGroupRatio(group)
	if topupGroupRatio == 0 {
		topupGroupRatio = 1
	}
	discount := 1.0
	if ds, ok := operation_setting.GetPaymentSetting().AmountDiscount[int(originalAmount)]; ok {
		if ds > 0 {
			discount = ds
		}
	}
	payMoney := amount * setting.StripeUnitPrice * topupGroupRatio * discount
	return payMoney
}

func getStripeMinTopup() int64 {
	return int64(setting.StripeMinTopUp)
}

func stripeInvoiceFromEvent(event stripe.Event) (*stripe.Invoice, error) {
	var inv stripe.Invoice
	if err := json.Unmarshal(event.Data.Raw, &inv); err != nil {
		return nil, err
	}
	return &inv, nil
}

func retrieveStripeInvoiceForFulfillment(ctx context.Context, inv *stripe.Invoice) *stripe.Invoice {
	if inv == nil || inv.ID == "" {
		return nil
	}
	configureStripeClient()
	params := &stripe.InvoiceParams{}
	params.AddExpand("payments.data.payment.payment_intent")
	params.AddExpand("payments.data.payment.charge")
	full, err := invoice.Get(inv.ID, params)
	if err != nil {
		logger.LogError(ctx, fmt.Sprintf("Stripe Invoice 获取失败 invoice_id=%s error=%q", inv.ID, err.Error()))
		return inv
	}
	return full
}

func stripeCheckoutSessionFromEvent(event stripe.Event) (*stripe.CheckoutSession, error) {
	var session stripe.CheckoutSession
	if err := json.Unmarshal(event.Data.Raw, &session); err != nil {
		return nil, err
	}
	return &session, nil
}

func retrieveStripeCheckoutSessionForFulfillment(ctx context.Context, session *stripe.CheckoutSession) *stripe.CheckoutSession {
	if session == nil || session.ID == "" {
		return nil
	}
	configureStripeClient()
	params := &stripe.CheckoutSessionParams{}
	params.AddExpand("customer")
	params.AddExpand("invoice")
	params.AddExpand("invoice.payments.data.payment")
	params.AddExpand("payment_intent.latest_charge")
	full, err := checkoutsession.Get(session.ID, params)
	if err != nil {
		logger.LogError(ctx, fmt.Sprintf("Stripe Checkout Session 获取失败 session_id=%s error=%q", session.ID, err.Error()))
		return session
	}
	return full
}

func stripeCheckoutSessionPayload(session *stripe.CheckoutSession, eventType string) map[string]any {
	payload := map[string]any{
		"payment_order_id":    stripeCheckoutSessionPaymentOrderID(session),
		"checkout_session_id": session.ID,
		"invoice_id":          stripeCheckoutSessionInvoiceID(session),
		"invoice_number":      stripeCheckoutSessionInvoiceNumber(session),
		"payment_intent_id":   stripeCheckoutSessionPaymentIntentID(session),
		"amount_total":        session.AmountTotal,
		"currency":            strings.ToUpper(string(session.Currency)),
		"event_type":          eventType,
		"payment_method":      stripeCheckoutSessionPaymentMethod(session),
		"payment_status":      string(session.PaymentStatus),
		"status":              string(session.Status),
		"hosted_invoice_url":  stripeCheckoutSessionHostedInvoiceURL(session),
		"invoice_pdf":         stripeCheckoutSessionInvoicePDF(session),
	}
	if charge := stripeCheckoutSessionCharge(session); charge != nil {
		payload["charge_id"] = charge.ID
		payload["receipt_url"] = charge.ReceiptURL
	}
	return payload
}

func stripeInvoicePayload(inv *stripe.Invoice, eventType string) map[string]any {
	payload := map[string]any{
		"payment_order_id":   stripeInvoicePaymentOrderID(inv),
		"invoice_id":         inv.ID,
		"invoice_number":     inv.Number,
		"amount_paid":        inv.AmountPaid,
		"amount_due":         inv.AmountDue,
		"currency":           strings.ToUpper(string(inv.Currency)),
		"event_type":         eventType,
		"payment_method":     stripeInvoicePaymentMethod(inv),
		"hosted_invoice_url": inv.HostedInvoiceURL,
		"invoice_pdf":        inv.InvoicePDF,
	}
	if paymentIntent := stripeInvoicePaymentIntent(inv); paymentIntent != nil {
		payload["payment_intent_id"] = paymentIntent.ID
	}
	if charge := stripeInvoiceCharge(inv); charge != nil {
		payload["charge_id"] = charge.ID
		payload["receipt_url"] = charge.ReceiptURL
	}
	return payload
}

func stripeCheckoutSessionPaymentOrderID(session *stripe.CheckoutSession) string {
	if session == nil {
		return ""
	}
	for _, value := range []string{
		session.Metadata[stripeMetadataPaymentOrderIDKey],
		session.ClientReferenceID,
	} {
		if strings.TrimSpace(value) != "" {
			return strings.TrimSpace(value)
		}
	}
	return ""
}

func stripeInvoicePaymentOrderID(inv *stripe.Invoice) string {
	if inv == nil {
		return ""
	}
	for _, value := range []string{
		inv.Metadata[stripeMetadataPaymentOrderIDKey],
	} {
		if strings.TrimSpace(value) != "" {
			return strings.TrimSpace(value)
		}
	}
	return ""
}

func stripeCheckoutSessionCustomerID(session *stripe.CheckoutSession) string {
	if session == nil || session.Customer == nil {
		return ""
	}
	return session.Customer.ID
}

func stripeCheckoutSessionPaymentIntentID(session *stripe.CheckoutSession) string {
	if session == nil || session.PaymentIntent == nil {
		return ""
	}
	return session.PaymentIntent.ID
}

func stripeCheckoutSessionInvoiceID(session *stripe.CheckoutSession) string {
	if session == nil || session.Invoice == nil {
		return ""
	}
	return session.Invoice.ID
}

func stripeCheckoutSessionInvoiceNumber(session *stripe.CheckoutSession) string {
	if session == nil || session.Invoice == nil {
		return ""
	}
	return session.Invoice.Number
}

func stripeCheckoutSessionHostedInvoiceURL(session *stripe.CheckoutSession) string {
	if session == nil || session.Invoice == nil {
		return ""
	}
	return session.Invoice.HostedInvoiceURL
}

func stripeCheckoutSessionInvoicePDF(session *stripe.CheckoutSession) string {
	if session == nil || session.Invoice == nil {
		return ""
	}
	return session.Invoice.InvoicePDF
}

func stripeCheckoutSessionPaymentMethod(session *stripe.CheckoutSession) string {
	charge := stripeCheckoutSessionCharge(session)
	if charge != nil && charge.PaymentMethodDetails != nil && charge.PaymentMethodDetails.Type != "" {
		return string(charge.PaymentMethodDetails.Type)
	}
	if session != nil && session.PaymentIntent != nil && session.PaymentIntent.PaymentMethod != nil && session.PaymentIntent.PaymentMethod.Type != "" {
		return string(session.PaymentIntent.PaymentMethod.Type)
	}
	if session == nil {
		return model.PaymentMethodStripe
	}
	methodTypes := session.PaymentMethodTypes
	if len(methodTypes) > 0 && methodTypes[0] != "" {
		return methodTypes[0]
	}
	return model.PaymentMethodStripe
}

func stripeCheckoutSessionCharge(session *stripe.CheckoutSession) *stripe.Charge {
	if session == nil || session.PaymentIntent == nil {
		return nil
	}
	if session.PaymentIntent.LatestCharge != nil && session.PaymentIntent.LatestCharge.ID != "" {
		return session.PaymentIntent.LatestCharge
	}
	return nil
}

func stripeInvoiceCustomerID(inv *stripe.Invoice) string {
	if inv == nil || inv.Customer == nil {
		return ""
	}
	return inv.Customer.ID
}

func stripeInvoicePaymentIntentID(inv *stripe.Invoice) string {
	paymentIntent := stripeInvoicePaymentIntent(inv)
	if paymentIntent == nil {
		return ""
	}
	return paymentIntent.ID
}

func stripeInvoicePaymentMethod(inv *stripe.Invoice) string {
	charge := stripeInvoiceCharge(inv)
	if charge != nil && charge.PaymentMethodDetails != nil && charge.PaymentMethodDetails.Type != "" {
		return string(charge.PaymentMethodDetails.Type)
	}
	if paymentIntent := stripeInvoicePaymentIntent(inv); paymentIntent != nil && paymentIntent.PaymentMethod != nil && paymentIntent.PaymentMethod.Type != "" {
		return string(paymentIntent.PaymentMethod.Type)
	}
	return model.PaymentMethodStripe
}

func stripeInvoicePaymentIntent(inv *stripe.Invoice) *stripe.PaymentIntent {
	if inv == nil || inv.Payments == nil {
		return nil
	}
	for _, payment := range inv.Payments.Data {
		if payment == nil || payment.Payment == nil || payment.Payment.PaymentIntent == nil {
			continue
		}
		if payment.Payment.PaymentIntent.ID != "" {
			return payment.Payment.PaymentIntent
		}
	}
	return nil
}

func stripeInvoiceCharge(inv *stripe.Invoice) *stripe.Charge {
	if inv == nil || inv.Payments == nil {
		return nil
	}
	for _, payment := range inv.Payments.Data {
		if payment == nil || payment.Payment == nil {
			continue
		}
		if payment.Payment.Charge != nil && payment.Payment.Charge.ID != "" {
			return payment.Payment.Charge
		}
		if payment.Payment.PaymentIntent != nil && payment.Payment.PaymentIntent.LatestCharge != nil && payment.Payment.PaymentIntent.LatestCharge.ID != "" {
			return payment.Payment.PaymentIntent.LatestCharge
		}
	}
	return nil
}

func stripeInvoiceStatus(inv *stripe.Invoice) string {
	if inv == nil {
		return common.TopUpStatusPending
	}
	switch inv.Status {
	case stripe.InvoiceStatusPaid:
		return common.TopUpStatusSuccess
	case stripe.InvoiceStatusUncollectible:
		return common.TopUpStatusFailed
	case stripe.InvoiceStatusVoid:
		return common.TopUpStatusExpired
	default:
		return common.TopUpStatusPending
	}
}

func stripeInvoiceRecordFromInvoice(inv *stripe.Invoice) StripeInvoiceRecord {
	record := StripeInvoiceRecord{
		Id:               inv.ID,
		UserId:           inv.Metadata[stripeMetadataUserIDKey],
		Amount:           0,
		Money:            centsToMoney(inv.AmountDue),
		TradeNo:          inv.ID,
		InvoiceId:        inv.ID,
		InvoiceNumber:    inv.Number,
		PaymentMethod:    stripeInvoicePaymentMethod(inv),
		PaymentProvider:  model.PaymentProviderStripe,
		CreateTime:       inv.Created,
		Status:           stripeInvoiceStatus(inv),
		Kind:             inv.Metadata[stripeMetadataKindKey],
		Currency:         strings.ToUpper(string(inv.Currency)),
		Description:      inv.Description,
		HostedInvoiceURL: inv.HostedInvoiceURL,
		InvoicePDF:       inv.InvoicePDF,
		CustomerId:       stripeInvoiceCustomerID(inv),
		CustomerEmail:    inv.CustomerEmail,
	}
	if inv.Number != "" {
		record.TradeNo = inv.Number
	}
	if inv.AmountPaid > 0 {
		record.Money = centsToMoney(inv.AmountPaid)
	}
	if inv.StatusTransitions != nil {
		record.CompleteTime = inv.StatusTransitions.PaidAt
	}
	if amount, err := strconv.ParseInt(inv.Metadata[stripeMetadataTopupUnitsKey], 10, 64); err == nil {
		record.Amount = amount
	}
	if charge := stripeInvoiceCharge(inv); charge != nil {
		record.ReceiptURL = charge.ReceiptURL
	}
	return record
}

func listStripeInvoiceRecords(customerId string, keyword string, pageInfo *common.PageInfo) ([]StripeInvoiceRecord, int64, error) {
	if validateStripeAPIConfig() != nil {
		return []StripeInvoiceRecord{}, 0, nil
	}
	configureStripeClient()
	pageSize := pageInfo.GetPageSize()
	start := pageInfo.GetStartIdx()
	params := &stripe.InvoiceListParams{}
	params.Limit = stripe.Int64(100)
	if customerId != "" {
		params.Customer = stripe.String(customerId)
	}
	params.AddExpand("data.payments.data.payment")

	iter := invoice.List(params)
	records := make([]StripeInvoiceRecord, 0, pageSize)
	var total int64
	for iter.Next() {
		inv := iter.Invoice()
		kind := inv.Metadata[stripeMetadataKindKey]
		if kind != stripeInvoiceKindTopup && kind != stripeInvoiceKindSubscriptionPurchase && kind != stripeInvoiceKindSubscriptionSwitch {
			continue
		}
		record := stripeInvoiceRecordFromInvoice(inv)
		if keyword != "" && !stripeInvoiceRecordMatches(record, keyword) {
			continue
		}
		if total >= int64(start) && len(records) < pageSize {
			records = append(records, record)
		}
		total++
	}
	if err := iter.Err(); err != nil {
		return nil, 0, err
	}
	return records, total, nil
}

func stripeInvoiceRecordMatches(record StripeInvoiceRecord, keyword string) bool {
	needle := strings.ToLower(strings.TrimSpace(keyword))
	if needle == "" {
		return true
	}
	haystacks := []string{
		record.Id,
		record.InvoiceId,
		record.InvoiceNumber,
		record.TradeNo,
		record.UserId,
		record.CustomerId,
		record.CustomerEmail,
		record.Kind,
		record.Description,
	}
	for _, value := range haystacks {
		if strings.Contains(strings.ToLower(value), needle) {
			return true
		}
	}
	return false
}

func RequestStripeBillingPortal(c *gin.Context) {
	if err := validateStripeAPIConfig(); err != nil {
		common.ApiErrorMsg(c, err.Error())
		return
	}
	userId := c.GetString("id")
	user, err := model.GetUserById(userId, false)
	if err != nil || user == nil {
		common.ApiErrorMsg(c, "用户不存在")
		return
	}
	configureStripeClient()
	customerId, err := ensureStripeCustomer(c.Request.Context(), user)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	returnURL := system_setting.ServerAddress + "/console/topup"
	params := &stripe.BillingPortalSessionParams{
		Customer:  stripe.String(customerId),
		ReturnURL: stripe.String(returnURL),
	}
	session, err := billingportalsession.New(params)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, gin.H{"url": session.URL})
}
