# 使用日志

- 路由：`/console/log`
- 标题：使用日志
- 访问：private；管理员看到更多字段和更多日志类型。
- 当前实现：`web/classic/src/pages/Log/index.jsx`、`web/classic/src/components/table/usage-logs/*`、`web/classic/src/hooks/usage-logs/useUsageLogsData.jsx`

## 功能

- 分页展示请求、错误、审计、安全、活动日志。
- 普通用户默认查询自己的日志；管理员查询全站日志。
- 支持按时间范围、令牌名称、模型名称、分组、Request ID 筛选。
- 管理员额外支持按渠道 ID、用户名筛选。
- 支持切换日志类型：
  - `usage` 消费。
  - `audit` 审计，仅管理员。
  - `error` 错误。
  - `security` 安全。
  - `activity` 活动。
- 支持查看统计：消耗额度、RPM、TPM。
- 支持展开日志详情：渠道信息、Request ID、语音/文字 token、缓存 token、计费过程、模型映射、错误原因、请求路径、流状态、参数覆盖、订阅结算等。
- 支持管理员查看日志对应用户信息。
- 支持查看渠道亲和使用缓存统计。
- 支持列显示配置、计费显示模式和紧凑模式。

## API

- `userLogs` query：普通用户日志列表。
- `logs` query：管理员日志列表。
- `logsSelfStat` query：普通用户统计。
- `logsStat` query：管理员统计。
- `user` query：管理员查看日志用户详情，必须传 `id`。
- `channelAffinityUsageCache` query：管理员查看亲和缓存统计。
- `deleteHistoryLogs` mutation：root 设置页的日志清理功能使用。

## 关键参数

- `p`、`page_size`
- `category`
- `start_timestamp`、`end_timestamp`
- `token_name`
- `model_name`
- `group`
- `request_id`
- 管理员额外：`username`、`channel`

## 新版实现注意

- 日志详情来自 `other` 字段解析，必须容错非法 JSON 或缺失字段。
- 管理员列和普通用户列不同，列偏好用不同 localStorage key。
- 非 `usage` 类型不显示消耗统计，统计值应重置为 0。
