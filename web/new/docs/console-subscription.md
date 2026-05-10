# 订阅管理

- 路由：`/console/subscription`
- 标题：订阅管理
- 访问：admin。
- 当前实现：`web/classic/src/pages/Subscription/index.jsx`、`web/classic/src/components/table/subscriptions/*`、`web/classic/src/hooks/subscriptions/useSubscriptionsData.jsx`

## 功能

- 管理订阅套餐。
- 支持创建、编辑、启用、禁用套餐。
- 支持分页和紧凑模式。
- 套餐可配置标题、副标题、价格、总额度、升级分组、排序、购买上限、启用状态、有效期、额度重置周期和 Stripe PriceId。

## API

- `adminSubscriptionPlans` query：套餐列表。
- `createSubscriptionPlan` mutation：输入 `{ plan: ... }`。
- `updateSubscriptionPlan` mutation：必须传 `id`，输入 `{ plan: ... }`。
- `updateSubscriptionPlanStatus` mutation：必须传 `id`，输入 `enabled`。
- `groups` query：加载升级分组选项。

## 套餐字段

- `title`
- `subtitle`
- `price_amount`
- `total_amount`
- `upgrade_group`
- `sort_order`
- `max_purchase_per_user`
- `enabled`
- `duration_unit`：`year`、`month`、`day`、`hour`、`custom`。
- `duration_value`
- `custom_seconds`
- `quota_reset_period`：`never`、`daily`、`weekly`、`monthly`、`custom`。
- `quota_reset_custom_seconds`
- `stripe_price_id`

## 新版实现注意

- `total_amount` 在表单中按显示额度编辑，提交前转换为站内额度。
- 升级分组在订阅失效/作废/删除后会回退到升级前分组，回退可能有延迟。
