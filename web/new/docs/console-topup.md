# 钱包管理

- 路由：`/console/topup`
- 标题：钱包管理
- 访问：private。
- 当前实现：`web/classic/src/pages/TopUp/index.js`、`web/classic/src/components/topup/*`

## 功能

- 展示当前余额、历史消耗、请求次数。
- 支持兑换码充值。
- 支持 Stripe 在线充值，含金额预估、支付确认；支付通过 Stripe Elements（Payment Element）在页内完成，支持 card / Alipay / WeChat Pay。
- 支持查看 Stripe 账单（直接来自 Stripe Invoice，本地不再存 TopUp 表）；支付回跳可通过 `?show_history=true` 自动打开账单。
- 支持展示可购买订阅套餐。
- 支持购买 Stripe 订阅套餐（Invoice + PaymentIntent 模式，非 Checkout 跳转）。
- 支持订阅之间切换（按差价补款），通过 `mode=switch` + `from_subscription_id` 发起。
- 支持查看当前所有有效订阅（`subscriptions`）和历史订阅（`all_subscriptions`）。
- 支持修改扣费偏好：钱包优先、订阅优先、仅用订阅等后端支持值。
- 支持打开 Stripe Billing Portal（自助管理发票、税号、支付方式）。
- 支持生成邀请链接、复制邀请链接、查看邀请收益、划转邀请收益到余额。

## API

- `self` query：刷新用户余额和邀请统计。
- `topupInfo` query：充值配置、金额选项、折扣、Stripe 开关、`stripe_publishable_key`、`stripe_payment_method_types`、支付方式。
- `topup` mutation：兑换码充值，输入 `key`。
- `stripeAmount` mutation：估算实付金额，输入 `amount`。
- `stripePay` mutation：创建充值 Invoice + PaymentIntent，输入 `amount`、`payment_method: "stripe"`；返回 `publishable_key`、`client_secret`、`customer_session_client_secret`、`invoice_id`、`payment_intent_id`、`hosted_invoice_url`、`invoice_pdf` 等供前端 Stripe Elements 渲染。
- `stripeBillingPortal` mutation：创建 Stripe Billing Portal Session，返回跳转 URL。
- `userTopups` query：当前用户账单，从 Stripe Invoice 列表拉取（用户未绑定 Stripe Customer 时返回空）。
- `adminTopups` query：管理员在账单弹窗中可查看全部 Stripe Invoice。
- `subscriptionPlans` query：用户可购买套餐。
- `subscriptionSelf` query：返回 `billing_preference`、`subscriptions`（当前所有有效订阅）、`all_subscriptions`（含已过期）。
- `updateSubscriptionPreference` mutation：输入 `billing_preference`。
- `subscriptionStripePay` mutation：输入 `plan_id`，可选 `mode`（`purchase` 或 `switch`）、`from_subscription_id`（切换时必填）；返回与 `stripePay` 同结构的 Stripe Elements 参数。
- `affCode` query：邀请码。
- `affTransfer` mutation：输入 `quota`。

## 状态与配置

- `status.price`：站点价格换算。
- `status.enable_stripe_topup`、`topupInfo.enable_stripe_topup`：Stripe 充值开关。
- `StripeMinTopUp` / `stripe_min_topup`：最小充值数量。
- `StripePublishableKey` / `stripe_publishable_key`：前端 Stripe Elements 初始化使用。
- `stripe_payment_method_types`：默认 `["card", "alipay", "wechat_pay"]`，下单时若 Alipay 不可用会回退为 `["card", "wechat_pay"]`。
- `payment_setting.amount_options`、`payment_setting.amount_discount`：预设充值数量和折扣。
- `TopupGroupRatio`：充值分组倍率。

## 新版实现注意

- 当前项目只保留 Stripe 支付，不要加入其他旧支付渠道。
- Stripe 支付使用 Stripe Elements 在页内完成，不再跳转 Checkout，不要复用旧的 `pay_link` 重定向流程。
- 兑换码充值成功后需要同步本地用户余额。
- 充值账单由 Stripe Invoice 作为唯一事实来源，本地 `TopUp` 表已移除；不要再写入或读取它。
- 管理员手动补单（旧 `completeTopup`）已下线，订单完成依赖 Stripe Webhook 回调。
- 订阅购买和普通充值是不同 mutation；订阅切换走同一 `subscriptionStripePay`，区别在 `mode=switch` + `from_subscription_id`，金额由后端按差价计算。
- `SubscriptionOrder` 新增 `purchase_mode`、`from_subscription_id`、`stripe_invoice_id`、`stripe_payment_intent_id` 字段，用于 Webhook 回调对账。
