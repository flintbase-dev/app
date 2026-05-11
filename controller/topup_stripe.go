package controller

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
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
	"github.com/stripe/stripe-go/v81"
	billingportalsession "github.com/stripe/stripe-go/v81/billingportal/session"
	"github.com/stripe/stripe-go/v81/customer"
	"github.com/stripe/stripe-go/v81/customersession"
	"github.com/stripe/stripe-go/v81/invoice"
	"github.com/stripe/stripe-go/v81/invoiceitem"
	"github.com/stripe/stripe-go/v81/paymentintent"
	"github.com/stripe/stripe-go/v81/webhook"
	"github.com/thanhpk/randstr"
)

const (
	stripeMetadataKindKey               = "new_api_kind"
	stripeMetadataUserIDKey             = "new_api_user_id"
	stripeMetadataTopupUnitsKey         = "new_api_topup_units"
	stripeMetadataCreditUnitsKey        = "new_api_credit_units"
	stripeMetadataOrderTradeNoKey       = "new_api_order_trade_no"
	stripeMetadataPlanIDKey             = "new_api_plan_id"
	stripeMetadataFromSubscriptionIDKey = "new_api_from_subscription_id"

	stripeInvoiceKindTopup                = "topup"
	stripeInvoiceKindSubscriptionPurchase = "subscription_purchase"
	stripeInvoiceKindSubscriptionSwitch   = "subscription_switch"

	stripePaymentMethodTypeCard      = "card"
	stripePaymentMethodTypeAlipay    = "alipay"
	stripePaymentMethodTypeWeChatPay = "wechat_pay"
)

var stripeAdaptor = &StripeAdaptor{}

// StripePayRequest represents a Stripe Elements payment request.
type StripePayRequest struct {
	Amount            int64  `json:"amount"`
	PaymentMethod     string `json:"payment_method"`
	PaymentMethodType string `json:"payment_method_type"`
}

type StripeAdaptor struct {
}

type stripeInvoicePaymentInput struct {
	User                   *model.User
	AmountCents            int64
	DisplayAmount          float64
	Currency               string
	Description            string
	InvoiceItemDescription string
	Metadata               map[string]string
	PaymentMethodType      string
}

type stripeInvoicePaymentSession struct {
	PublishableKey              string  `json:"publishable_key"`
	ClientSecret                string  `json:"client_secret"`
	CustomerSessionClientSecret string  `json:"customer_session_client_secret,omitempty"`
	InvoiceId                   string  `json:"invoice_id"`
	InvoiceNumber               string  `json:"invoice_number"`
	PaymentIntentId             string  `json:"payment_intent_id"`
	HostedInvoiceURL            string  `json:"hosted_invoice_url"`
	InvoicePDF                  string  `json:"invoice_pdf"`
	Amount                      float64 `json:"amount"`
	AmountCents                 int64   `json:"amount_cents"`
	Currency                    string  `json:"currency"`
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
	if err := validateStripeElementsPaymentConfig(); err != nil {
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

	reference := fmt.Sprintf("new-api-invoice-topup-%s-%d-%s", user.Id, time.Now().UnixMilli(), randstr.String(4))
	referenceId := "inv_topup_" + common.Sha1([]byte(reference))
	metadata := stripeBaseMetadata(stripeInvoiceKindTopup, user.Id)
	metadata["new_api_reference_id"] = referenceId
	metadata[stripeMetadataTopupUnitsKey] = strconv.FormatInt(req.Amount, 10)
	metadata[stripeMetadataCreditUnitsKey] = strconv.FormatFloat(creditUnits, 'f', 6, 64)

	session, err := createStripeInvoicePayment(c.Request.Context(), stripeInvoicePaymentInput{
		User:                   user,
		AmountCents:            amountCents,
		DisplayAmount:          payMoney,
		Currency:               stripeCurrency(),
		Description:            fmt.Sprintf("Wallet top up %d", req.Amount),
		InvoiceItemDescription: fmt.Sprintf("Wallet credits: %d units", req.Amount),
		Metadata:               metadata,
		PaymentMethodType:      normalizeStripeInvoicePaymentMethodType(req.PaymentMethodType),
	})
	if err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("Stripe 创建 Invoice 充值失败 user_id=%s amount=%d error=%q", id, req.Amount, err.Error()))
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "拉起支付失败"})
		return
	}

	logger.LogInfo(c.Request.Context(), fmt.Sprintf("Stripe Invoice 充值创建成功 user_id=%s invoice_id=%s amount=%d money=%.2f", id, session.InvoiceId, req.Amount, payMoney))
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
	if !inv.Paid && inv.Status != stripe.InvoiceStatusPaid {
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
	if kind == stripeInvoiceKindSubscriptionPurchase || kind == stripeInvoiceKindSubscriptionSwitch {
		payload := stripeInvoicePayload(inv, string(event.Type))
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
	if kind == stripeInvoiceKindSubscriptionPurchase || kind == stripeInvoiceKindSubscriptionSwitch {
		if err := model.ExpireSubscriptionOrder(tradeNo, model.PaymentProviderStripe); err != nil && !errors.Is(err, model.ErrSubscriptionOrderNotFound) {
			logger.LogError(ctx, fmt.Sprintf("Stripe 订阅订单关闭处理失败 invoice_id=%s trade_no=%s client_ip=%s error=%q", inv.ID, tradeNo, callerIp, err.Error()))
			return err
		}
		logger.LogInfo(ctx, fmt.Sprintf("Stripe 订阅订单已关闭 invoice_id=%s trade_no=%s client_ip=%s", inv.ID, tradeNo, callerIp))
	}
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
	created, err := model.CompleteStripeInvoiceTopUp(model.StripeInvoiceTopUpParams{
		UserId:          userId,
		InvoiceId:       inv.ID,
		PaymentIntentId: stripeInvoicePaymentIntentID(inv),
		CustomerId:      customerId,
		PaymentMethod:   paymentMethod,
		CreditUnits:     creditUnits,
		TopUpUnits:      topupUnits,
		PaidAmount:      centsToMoney(inv.AmountPaid),
		Currency:        string(inv.Currency),
		CallerIp:        callerIp,
	})
	if err != nil {
		logger.LogError(ctx, fmt.Sprintf("Stripe Invoice 充值处理失败 invoice_id=%s user_id=%s client_ip=%s error=%q", inv.ID, userId, callerIp, err.Error()))
		return err
	}
	if !created {
		logger.LogInfo(ctx, fmt.Sprintf("Stripe Invoice 充值已处理，跳过重复履约 invoice_id=%s user_id=%s client_ip=%s", inv.ID, userId, callerIp))
		return nil
	}
	logger.LogInfo(ctx, fmt.Sprintf("Stripe Invoice 充值成功 invoice_id=%s user_id=%s amount_paid=%.2f currency=%s client_ip=%s", inv.ID, userId, centsToMoney(inv.AmountPaid), strings.ToUpper(string(inv.Currency)), callerIp))
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
	if err := model.CompleteSubscriptionOrder(tradeNo, common.GetJsonString(payload), model.PaymentProviderStripe, actualPaymentMethod, inv.ID); err != nil {
		logger.LogError(ctx, fmt.Sprintf("Stripe Invoice 订阅订单处理失败 invoice_id=%s trade_no=%s client_ip=%s error=%q", inv.ID, tradeNo, callerIp, err.Error()))
		return err
	}
	logger.LogInfo(ctx, fmt.Sprintf("Stripe Invoice 订阅订单处理成功 invoice_id=%s trade_no=%s client_ip=%s", inv.ID, tradeNo, callerIp))
	return nil
}

func createStripeInvoicePayment(ctx context.Context, input stripeInvoicePaymentInput) (*stripeInvoicePaymentSession, error) {
	if input.User == nil {
		return nil, errors.New("用户不存在")
	}
	if err := validateStripeElementsPaymentConfig(); err != nil {
		return nil, err
	}
	if input.AmountCents <= 0 {
		return nil, errors.New("支付金额过低")
	}
	stripe.Key = setting.StripeApiSecret

	customerId, err := ensureStripeCustomer(ctx, input.User)
	if err != nil {
		return nil, err
	}
	metadata := cloneStringMap(input.Metadata)
	metadata[stripeMetadataUserIDKey] = input.User.Id
	paymentMethodTypes := stripeInvoicePaymentMethodTypes(input.PaymentMethodType)

	invoiceParams := &stripe.InvoiceParams{
		AutoAdvance:      stripe.Bool(false),
		CollectionMethod: stripe.String(string(stripe.InvoiceCollectionMethodChargeAutomatically)),
		Currency:         stripe.String(input.Currency),
		Customer:         stripe.String(customerId),
		Description:      stripe.String(input.Description),
		Metadata:         metadata,
		PaymentSettings: &stripe.InvoicePaymentSettingsParams{
			PaymentMethodTypes: paymentMethodTypes,
		},
	}
	invoiceParams.AddExpand("payment_intent")
	draftInvoice, err := invoice.New(invoiceParams)
	if err != nil && input.PaymentMethodType == "" && strings.Contains(strings.ToLower(err.Error()), "alipay") {
		invoiceParams.PaymentSettings.PaymentMethodTypes = stripeInvoiceFallbackPaymentMethodTypes()
		draftInvoice, err = invoice.New(invoiceParams)
	}
	if err != nil {
		return nil, err
	}

	itemMetadata := cloneStringMap(metadata)
	itemMetadata["new_api_invoice_id"] = draftInvoice.ID
	if _, err := invoiceitem.New(&stripe.InvoiceItemParams{
		Amount:      stripe.Int64(input.AmountCents),
		Currency:    stripe.String(input.Currency),
		Customer:    stripe.String(customerId),
		Description: stripe.String(input.InvoiceItemDescription),
		Invoice:     stripe.String(draftInvoice.ID),
		Metadata:    itemMetadata,
	}); err != nil {
		_, _ = invoice.Del(draftInvoice.ID, &stripe.InvoiceParams{})
		return nil, err
	}

	finalizeParams := &stripe.InvoiceFinalizeInvoiceParams{
		AutoAdvance: stripe.Bool(false),
	}
	finalizeParams.AddExpand("payment_intent")
	finalizedInvoice, err := invoice.FinalizeInvoice(draftInvoice.ID, finalizeParams)
	if err != nil {
		return nil, err
	}
	if finalizedInvoice.PaymentIntent == nil || finalizedInvoice.PaymentIntent.ID == "" {
		getParams := &stripe.InvoiceParams{}
		getParams.AddExpand("payment_intent")
		finalizedInvoice, err = invoice.Get(finalizedInvoice.ID, getParams)
		if err != nil {
			return nil, err
		}
	}
	if finalizedInvoice.PaymentIntent == nil || finalizedInvoice.PaymentIntent.ClientSecret == "" {
		return nil, errors.New("Stripe Invoice 未返回 PaymentIntent client_secret")
	}

	if _, err := paymentintent.Update(finalizedInvoice.PaymentIntent.ID, stripePaymentIntentUpdateParams(input.User.Email, metadata, paymentMethodTypes)); err != nil {
		logger.LogWarn(ctx, fmt.Sprintf("Stripe PaymentIntent 更新支付方式选项失败 invoice_id=%s payment_intent_id=%s error=%q", finalizedInvoice.ID, finalizedInvoice.PaymentIntent.ID, err.Error()))
	}

	customerSessionSecret := ""
	if input.PaymentMethodType == stripePaymentMethodTypeCard {
		if secret, err := createStripeCustomerSession(customerId); err == nil {
			customerSessionSecret = secret
		} else {
			logger.LogWarn(ctx, fmt.Sprintf("Stripe CustomerSession 创建失败 customer_id=%s error=%q", customerId, err.Error()))
		}
	}

	return &stripeInvoicePaymentSession{
		PublishableKey:              setting.StripePublishableKey,
		ClientSecret:                finalizedInvoice.PaymentIntent.ClientSecret,
		CustomerSessionClientSecret: customerSessionSecret,
		InvoiceId:                   finalizedInvoice.ID,
		InvoiceNumber:               finalizedInvoice.Number,
		PaymentIntentId:             finalizedInvoice.PaymentIntent.ID,
		HostedInvoiceURL:            finalizedInvoice.HostedInvoiceURL,
		InvoicePDF:                  finalizedInvoice.InvoicePDF,
		Amount:                      input.DisplayAmount,
		AmountCents:                 input.AmountCents,
		Currency:                    strings.ToUpper(input.Currency),
	}, nil
}

func ensureStripeCustomer(ctx context.Context, user *model.User) (string, error) {
	if user == nil {
		return "", errors.New("用户不存在")
	}
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

func createStripeCustomerSession(customerId string) (string, error) {
	if customerId == "" {
		return "", errors.New("empty customer id")
	}
	session, err := customersession.New(&stripe.CustomerSessionParams{
		Customer: stripe.String(customerId),
		Components: &stripe.CustomerSessionComponentsParams{
			PaymentElement: &stripe.CustomerSessionComponentsPaymentElementParams{
				Enabled: stripe.Bool(true),
				Features: &stripe.CustomerSessionComponentsPaymentElementFeaturesParams{
					PaymentMethodRedisplay:      stripe.String(string(stripe.CustomerSessionComponentsPaymentElementFeaturesPaymentMethodRedisplayEnabled)),
					PaymentMethodRedisplayLimit: stripe.Int64(5),
					PaymentMethodRemove:         stripe.String(string(stripe.CustomerSessionComponentsPaymentElementFeaturesPaymentMethodRemoveEnabled)),
					PaymentMethodSave:           stripe.String(string(stripe.CustomerSessionComponentsPaymentElementFeaturesPaymentMethodSaveEnabled)),
					PaymentMethodSaveUsage:      stripe.String(string(stripe.CustomerSessionComponentsPaymentElementFeaturesPaymentMethodSaveUsageOffSession)),
				},
			},
		},
	})
	if err != nil {
		return "", err
	}
	return session.ClientSecret, nil
}

func stripePaymentIntentUpdateParams(email string, metadata map[string]string, paymentMethodTypes []*string) *stripe.PaymentIntentParams {
	none := "none"
	params := &stripe.PaymentIntentParams{
		ReceiptEmail:       stripe.String(email),
		Metadata:           metadata,
		PaymentMethodTypes: paymentMethodTypes,
	}
	for _, method := range paymentMethodTypes {
		if method == nil {
			continue
		}
		switch *method {
		case stripePaymentMethodTypeAlipay:
			if params.PaymentMethodOptions == nil {
				params.PaymentMethodOptions = &stripe.PaymentIntentPaymentMethodOptionsParams{}
			}
			params.PaymentMethodOptions.Alipay = &stripe.PaymentIntentPaymentMethodOptionsAlipayParams{
				SetupFutureUsage: stripe.String(none),
			}
		case stripePaymentMethodTypeWeChatPay:
			if params.PaymentMethodOptions == nil {
				params.PaymentMethodOptions = &stripe.PaymentIntentPaymentMethodOptionsParams{}
			}
			params.PaymentMethodOptions.WeChatPay = &stripe.PaymentIntentPaymentMethodOptionsWeChatPayParams{
				Client:           stripe.String("web"),
				SetupFutureUsage: stripe.String(none),
			}
		}
	}
	return params
}

func normalizeStripeInvoicePaymentMethodType(method string) string {
	switch method {
	case stripePaymentMethodTypeCard, stripePaymentMethodTypeAlipay, stripePaymentMethodTypeWeChatPay:
		return method
	default:
		return ""
	}
}

func stripeInvoicePaymentMethodTypes(method string) []*string {
	switch method {
	case stripePaymentMethodTypeCard, stripePaymentMethodTypeAlipay, stripePaymentMethodTypeWeChatPay:
		return []*string{stripe.String(method)}
	default:
		return []*string{
			stripe.String(stripePaymentMethodTypeCard),
			stripe.String(stripePaymentMethodTypeAlipay),
			stripe.String(stripePaymentMethodTypeWeChatPay),
		}
	}
}

func stripeInvoiceFallbackPaymentMethodTypes() []*string {
	return []*string{
		stripe.String(stripePaymentMethodTypeCard),
		stripe.String(stripePaymentMethodTypeWeChatPay),
	}
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

func validateStripeElementsPaymentConfig() error {
	if err := validateStripeAPIConfig(); err != nil {
		return err
	}
	if err := validateStripePublishableKeyConfig(); err != nil {
		return err
	}
	return validateStripeWebhookConfig()
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
	stripe.Key = setting.StripeApiSecret
	params := &stripe.InvoiceParams{}
	params.AddExpand("payment_intent.latest_charge")
	params.AddExpand("charge")
	full, err := invoice.Get(inv.ID, params)
	if err != nil {
		logger.LogError(ctx, fmt.Sprintf("Stripe Invoice 获取失败 invoice_id=%s error=%q", inv.ID, err.Error()))
		return inv
	}
	return full
}

func stripeInvoicePayload(inv *stripe.Invoice, eventType string) map[string]any {
	payload := map[string]any{
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
	if inv.PaymentIntent != nil {
		payload["payment_intent_id"] = inv.PaymentIntent.ID
	}
	if inv.Charge != nil {
		payload["charge_id"] = inv.Charge.ID
		payload["receipt_url"] = inv.Charge.ReceiptURL
	}
	return payload
}

func stripeInvoiceCustomerID(inv *stripe.Invoice) string {
	if inv == nil || inv.Customer == nil {
		return ""
	}
	return inv.Customer.ID
}

func stripeInvoicePaymentIntentID(inv *stripe.Invoice) string {
	if inv == nil || inv.PaymentIntent == nil {
		return ""
	}
	return inv.PaymentIntent.ID
}

func stripeInvoicePaymentMethod(inv *stripe.Invoice) string {
	charge := stripeInvoiceCharge(inv)
	if charge != nil && charge.PaymentMethodDetails != nil && charge.PaymentMethodDetails.Type != "" {
		return string(charge.PaymentMethodDetails.Type)
	}
	if inv != nil && inv.PaymentIntent != nil && inv.PaymentIntent.PaymentMethod != nil && inv.PaymentIntent.PaymentMethod.Type != "" {
		return string(inv.PaymentIntent.PaymentMethod.Type)
	}
	return model.PaymentMethodStripe
}

func stripeInvoiceCharge(inv *stripe.Invoice) *stripe.Charge {
	if inv == nil {
		return nil
	}
	if inv.Charge != nil && inv.Charge.ID != "" {
		return inv.Charge
	}
	if inv.PaymentIntent != nil && inv.PaymentIntent.LatestCharge != nil && inv.PaymentIntent.LatestCharge.ID != "" {
		return inv.PaymentIntent.LatestCharge
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
	stripe.Key = setting.StripeApiSecret
	pageSize := pageInfo.GetPageSize()
	start := pageInfo.GetStartIdx()
	params := &stripe.InvoiceListParams{}
	params.Limit = stripe.Int64(100)
	if customerId != "" {
		params.Customer = stripe.String(customerId)
	}
	params.AddExpand("data.payment_intent.latest_charge")
	params.AddExpand("data.charge")

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
	stripe.Key = setting.StripeApiSecret
	customerId, err := ensureStripeCustomer(c.Request.Context(), user)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	returnURL := system_setting.ServerAddress + "/console/topup"
	session, err := billingportalsession.New(&stripe.BillingPortalSessionParams{
		Customer:  stripe.String(customerId),
		ReturnURL: stripe.String(returnURL),
	})
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, gin.H{"url": session.URL})
}
