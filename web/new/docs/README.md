# 新版 UI 页面与 API 实现资料

本目录记录当前 `web/classic` UI 的页面功能契约，用于新版 UI 重建。文档只描述页面标题、功能、状态、数据来源和 API 使用，不描述现有设计、布局、配色或组件外观。

## 全局约定

- 前端路由来源：`web/classic/src/App.jsx`。
- 浏览器控制面 API：统一调用 `POST /api/graphql`，客户端封装在 `web/classic/src/helpers/api.js`。
- GraphQL 操作清单：前端 `web/classic/src/helpers/apiOperations.js` 必须与后端 `router/graphql_api.go` 对齐。
- 所有 GraphQL 字段都接收 `$input: JSON` 和 `$params: JSON`，并返回 JSON scalar。前端规则是 query 默认把变量放入 `params`，mutation 默认把变量放入 `input`；需要同时传 body 和 query 参数时显式传 `{ input, params }`。
- 页面级基础状态由 `PageLayout` 加载：`status` 写入 `StatusContext` 和 localStorage，用户信息从 localStorage 恢复到 `UserContext`。
- 访问控制：
  - public：无需登录。
  - private：需要 localStorage 中存在 `user`。
  - admin：需要 `user.role >= 10`。
  - root：设置页由 admin route 包住，但实际只在 `isRoot()` 为真时渲染设置项。
- 当前仓库是 fresh deploy only，不应为旧 REST `/api/*` 或旧自建用户系统写兼容逻辑。

## 页面文档

| 页面 | 文档 |
| --- | --- |
| 首页 | [home.md](home.md) |
| 初始化 | [setup.md](setup.md) |
| WorkOS 登录 | [login.md](login.md) |
| WorkOS 回调 | [workos-callback.md](workos-callback.md) |
| 禁止访问 | [forbidden.md](forbidden.md) |
| 未找到页面 | [not-found.md](not-found.md) |
| 数据看板 | [console-dashboard.md](console-dashboard.md) |
| 渠道管理 | [console-channel.md](console-channel.md) |
| 令牌管理 | [console-token.md](console-token.md) |
| 我的消息 | [console-messages.md](console-messages.md) |
| 操练场 | [console-playground.md](console-playground.md) |
| 兑换码管理 | [console-redemption.md](console-redemption.md) |
| 用户管理 | [console-user.md](console-user.md) |
| 系统设置 | [console-setting.md](console-setting.md) |
| 个人设置 | [console-personal.md](console-personal.md) |
| 钱包管理 | [console-topup.md](console-topup.md) |
| 使用日志 | [console-log.md](console-log.md) |
| 模型管理 | [console-models.md](console-models.md) |
| 订阅管理 | [console-subscription.md](console-subscription.md) |
| 消息管理 | [console-message-management.md](console-message-management.md) |
| 模型广场 | [pricing.md](pricing.md) |
| 公开广播 | [broadcasts.md](broadcasts.md) |
| 关于 | [about.md](about.md) |
| 用户协议 | [user-agreement.md](user-agreement.md) |
| 隐私政策 | [privacy-policy.md](privacy-policy.md) |
| 聊天集成页 | [console-chat.md](console-chat.md) |
| Chat2Link 跳转页 | [chat2link.md](chat2link.md) |

## API 文档

- [graphql-api.md](graphql-api.md)
