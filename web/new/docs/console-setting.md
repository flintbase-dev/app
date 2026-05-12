# 系统设置

- 路由：`/console/setting`
- 标题：系统设置
- 访问：admin 路由包裹；当前页面内容只在 `isRoot()` 为真时渲染。
- 当前实现：`web/classic/src/pages/Setting/index.jsx`、`web/classic/src/components/settings/*`、`web/classic/src/pages/Setting/*`

## 功能

- 通过 `?tab=` 保存当前设置分区，默认进入 `operation`。
- 支持运营、仪表盘、聊天、绘图、支付、分组与模型定价、速率限制、模型相关、性能、系统、其他设置。
- 每个分区进入时从 `options` 加载系统选项，保存时调用 `updateOption`。
- 设置页使用 root 级 GraphQL 操作；新版 UI 不应接旧 REST 设置接口。

## 页面内分区

### 运营设置

- 通用设置：充值链接、文档地址、失败重试次数、全站货币显示、令牌额度统计显示、默认折叠侧边栏、用户最大令牌数。
- 顶栏模块：配置首页、控制台、模型广场、公开广播、文档、关于等入口是否显示及是否要求登录。
- 管理员侧边栏模块：配置聊天区、控制台区、个人中心区、管理员区及其子模块是否可见。
- 敏感词：启用敏感词过滤、提示词检查、敏感词列表。
- 日志：按时间和类型清除历史错误、安全或活动日志。
- 监控：定时测试渠道、自动禁用/启用渠道、禁用关键字、自动禁用状态码、自动重试状态码、额度提醒阈值。
- 额度：新用户额度、预消耗额度、邀请人和被邀请人奖励额度、免费模型预消耗开关。
- 签到：签到开关、每日随机奖励最小值和最大值。

### 仪表盘设置

- 数据看板默认时间粒度：`hour`、`day`、`week`。
- API 信息卡片：开关、URL、路由、描述、颜色。
- FAQ：开关、问题、答案。
- Uptime Kuma：开关、分组名称、状态页 URL、slug。

### 聊天设置

- 管理 `Chats` JSON 配置，格式为数组，数组项是 `{ 名称: URL模板 }`。
- 支持可视化编辑和 JSON 编辑。
- 支持内置模板：Cherry Studio、AionUI、流畅阅读、CC Switch、DeepChat、Lobe Chat、AI as Workspace、AMA 问天、OpenCat。
- URL 模板支持 `{address}`、`{key}` 以及特定客户端配置变量，例如 `{cherryConfig}`、`{aionuiConfig}`、`{deepchatConfig}`。

### 绘图设置

- 配置 `DrawingEnabled`，决定绘图能力是否在前端暴露。

### 支付设置

- 通用：`ServerAddress`、`TopupGroupRatio`、`payment_setting.amount_options`、`payment_setting.amount_discount`。
- Stripe：`StripeApiSecret`、`StripeWebhookSecret`、`StripePublishableKey`、`StripeUnitPrice`、`StripeMinTopUp`、`StripePromotionCodesEnabled`；后端统一使用 Stripe API version `2026-04-22.dahlia`。

### 分组与模型定价设置

- 模型定价：`BillingMode`、`BillingExpr`、`ModelPrice`、`CompletionPrice`、`ModelFixedPrice`、`CacheRatio`、`CreateCacheRatio`、`ImageRatio`、`AudioRatio`、`AudioCompletionRatio`。
- 分组：`GroupRatio`、`GroupGroupRatio`、`AutoGroups`、`DefaultUseAutoGroup`、`ExposeRatioEnabled`、`UserUsableGroups`、`group_ratio_setting.group_special_usable_group`。
- 未设置价格模型：使用已启用渠道模型辅助补齐价格配置。
- 上游价格同步：从可同步渠道拉取价格倍率，预览后写入相关价格选项。
- 工具调用定价：维护工具名到价格的映射。

### 速率限制设置

- 配置模型请求限流开关、失败次数阈值、成功次数阈值、统计窗口分钟数和分组规则。

### 模型相关设置

- 全局：请求透传、思考模型黑名单、Chat Completions 到 Responses 策略、通道 ping 间隔。
- 渠道亲和：规则配置、缓存查看、按条件清理缓存。
- Gemini：安全设置、版本设置、支持的 imagine 模型、thinking adapter、function response id 处理。
- Claude：模型请求头、thinking adapter、默认最大 token、thinking 预算比例。
- Grok：违规扣费开关和扣费金额。

### 性能设置

- 磁盘缓存：开关、阈值、最大大小、路径。
- 性能监控：CPU、内存、磁盘阈值。
- 运行状态：内存、GC、goroutine、磁盘缓存统计。
- 操作：清理磁盘缓存、重置性能统计、触发 GC。

### 系统设置

- 服务器地址：影响支付回调地址和公开展示的服务地址。
- Worker：图片请求代理地址、密钥、是否允许 HTTP 图片请求。
- SSRF 防护：开关、私有 IP 访问、域名过滤模式和列表、IP 过滤模式和列表、允许端口、域名解析后 IP 过滤。
- WorkOS 身份：展示 WorkOS Client ID 和 Redirect URI；这些值当前来自环境/后端状态，不在本页编辑。
- Postmark：API 地址、Message Stream、发件人邮箱、Server Token。
- hCaptcha：Site Key 和 Secret Key。

### 其他设置

- 系统信息：当前版本、启动时间、检查 GitHub 最新 release。
- 法务内容：`legal.user_agreement`、`legal.privacy_policy`。
- 个性化：`SystemName`、`Logo`、`HomePageContent`、`About`、`Footer`。
- `HomePageContent` 和 `About` 支持 Markdown/HTML；如果值是 URL，相关公开页面会以外部内容形式加载。

## API

- `options` query：加载系统选项。
- `updateOption` mutation：更新系统选项，输入 `key`、`value`。
- `deleteHistoryLogs` mutation：清理历史日志，参数 `category`、`target_timestamp`。
- `channelAffinityCache` query：查看渠道亲和缓存统计。
- `clearChannelAffinityCache` mutation：清理渠道亲和缓存。
- `enabledChannelModels` query：未设置价格模型辅助配置。
- `syncableChannels` query：加载可同步价格的渠道。
- `fetchUpstreamRatios` mutation：从上游渠道拉取价格倍率。
- `resetModelPrices` mutation：重置模型价格。
- `performanceStats` query：加载性能统计。
- `clearDiskCache` mutation：清理磁盘缓存。
- `resetPerformanceStats` mutation：重置性能统计。
- `forceGC` mutation：触发 GC。

## 新版实现注意

- 页面虽然挂在 admin route 下，但设置内容应按 root 权限处理。
- 保存布尔值时当前实现统一转为字符串 `"true"` / `"false"`。
- JSON 类型选项需要在加载时格式化，在保存前验证 JSON 有效性。
- `Chats` 是 `/console/chat/:id?` 和侧边栏聊天入口的数据源。
- 不要为旧 REST 设置接口或旧登录系统保留兼容路径。
