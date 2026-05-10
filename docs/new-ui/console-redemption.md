# 兑换码管理

- 路由：`/console/redemption`
- 标题：兑换码管理
- 访问：admin。
- 当前实现：`web/classic/src/pages/Redemption/index.jsx`、`web/classic/src/components/table/redemptions/*`、`web/classic/src/hooks/redemptions/useRedemptionsData.jsx`

## 功能

- 分页展示兑换码。
- 支持按关键字搜索。
- 支持新建单个或批量兑换码。
- 支持编辑兑换码名称、额度、过期时间。
- 支持启用、禁用、删除单个兑换码。
- 支持复制选中的兑换码。
- 支持删除所有失效兑换码，包括已使用、已禁用和过期。
- 批量创建成功后可下载兑换码文本。

## API

- `redemptions` query：列表，参数 `p`、`page_size`。
- `searchRedemptions` query：搜索，参数 `keyword`、`p`、`page_size`。
- `redemption` query：详情，必须传 `id`。
- `createRedemption` mutation：创建兑换码。
- `updateRedemption` mutation：更新兑换码；状态切换使用 `{ input, params: { status_only: true } }`。
- `deleteRedemption` mutation：删除单个兑换码，必须传 `id`。
- `deleteInvalidRedemptions` mutation：清理失效兑换码。

## 兑换码字段

- `name`
- `amount` / `quota`
- `count`，仅新建时使用。
- `expired_time`，空值表示永久。
- `status`

## 新版实现注意

- 新建时如果名称为空，会用额度渲染值作为名称。
- 过期判断同时依赖 `status` 和 `expired_time`。
