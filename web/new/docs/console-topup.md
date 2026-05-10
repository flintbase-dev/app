# 钱包管理

- 路由：`/console/topup`
- 标题：钱包管理
- 访问：private。
- 当前实现：`web/classic/src/pages/TopUp/index.js`、`web/classic/src/components/topup/*`

## 功能

- 展示当前余额、历史消耗、请求次数。
- 支持兑换码充值。
- 支持 Stripe 在线充值，含金额预估、支付确认和打开支付链接。
- 支持查看充值账单；支付回跳可通过 `?show_history=true` 自动打开账单。
- 支持展示可购买订阅套餐。
- 支持购买 Stripe 订阅套餐。
- 支持查看当前有效订阅和历史订阅。
- 支持修改扣费偏好：钱包优先、订阅优先、仅用订阅等后端支持值。
- 支持生成邀请链接、复制邀请链接、查看邀请收益、划转邀请收益到余额。

## API

- `self` query：刷新用户余额和邀请统计。
- `topupInfo` query：充值配置、金额选项、折扣、Stripe 开关和支付方式。
- `topup` mutation：兑换码充值，输入 `key`。
- `stripeAmount` mutation：估算实付金额，输入 `amount`。
- `stripePay` mutation：创建充值支付，输入 `amount`、`payment_method: "stripe"`。
- `userTopups` query：当前用户账单。
- `adminTopups` query：管理员在账单弹窗中可查看全部账单。
- `completeTopup` mutation：管理员手动完成充值。
- `subscriptionPlans` query：用户可购买套餐。
- `subscriptionSelf` query：当前用户订阅和扣费偏好。
- `updateSubscriptionPreference` mutation：输入 `billing_preference`。
- `subscriptionStripePay` mutation：输入 `plan_id`。
- `affCode` query：邀请码。
- `affTransfer` mutation：输入 `quota`。

## 状态与配置

- `status.price`：站点价格换算。
- `status.enable_stripe_topup`、`topupInfo.enable_stripe_topup`：Stripe 充值开关。
- `StripeMinTopUp` / `stripe_min_topup`：最小充值数量。
- `payment_setting.amount_options`、`payment_setting.amount_discount`：预设充值数量和折扣。
- `TopupGroupRatio`：充值分组倍率。

## 新版实现注意

- 当前项目只保留 Stripe 支付，不要加入其他旧支付渠道。
- 兑换码充值成功后需要同步本地用户余额。
- 订阅购买和普通充值是不同 mutation。
