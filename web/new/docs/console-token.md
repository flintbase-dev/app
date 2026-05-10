# 令牌管理

- 路由：`/console/token`
- 标题：令牌管理
- 访问：private。
- 当前实现：`web/classic/src/pages/Token/index.jsx`、`web/classic/src/components/table/tokens/*`、`web/classic/src/hooks/tokens/useTokensData.jsx`

## 功能

- 分页展示当前用户令牌。
- 支持按关键字和令牌内容搜索。
- 支持创建单个或批量令牌。
- 支持编辑令牌名称、分组、过期时间、额度、无限额度、模型限制、IP 白名单、自动分组跨分组重试。
- 支持启用、禁用、删除、批量删除。
- 支持查看和复制真实令牌密钥，复制时加 `sk-` 前缀。
- 支持批量复制密钥或“名称 + 密钥”。
- 支持复制连接字符串 `{ _type, key, url }`。
- 支持打开第三方聊天/客户端集成链接，使用当前服务地址和令牌密钥替换模板变量。
- 支持表格紧凑模式和分页大小。

## API

- `tokens` query：列表，参数 `p`、`size`。
- `searchTokens` query：搜索，参数 `keyword`、`token`、`p`、`size`。
- `token` query：详情，必须传 `id`。
- `tokenKey` mutation：查看单个密钥，必须传 `id`。
- `tokenKeysBatch` mutation：批量查看密钥，输入 `ids`。
- `createToken` mutation：创建令牌。
- `updateToken` mutation：更新令牌；状态开关使用 `{ input, params: { status_only: true } }`。
- `deleteToken` mutation：删除单个令牌，必须传 `id`。
- `deleteTokens` mutation：批量删除，输入 `ids`。
- `userModels` query：编辑令牌时加载可选模型。
- `selfGroups` query：编辑令牌时加载可选分组和分组倍率。

## 令牌表单字段

- `name`
- `group`
- `cross_group_retry`
- `expired_time`，`-1` 表示永不过期。
- `tokenCount`，仅新建时使用。
- `remain_amount` / `remain_quota`
- `unlimited_quota`
- `model_limits`
- `allow_ips`

## 新版实现注意

- 真实 token key 默认不随列表返回，必须按需调用 `tokenKey` 或 `tokenKeysBatch`。
- 创建多个令牌时会为名称追加随机后缀。
- 服务地址来源为 `status.server_address` 或 `window.location.origin`。
