# 首页

- 路由：`/`
- 标题：使用 `status.SystemName` 作为浏览器标题；页面正文没有固定文档标题。
- 访问：public。
- 当前实现：`web/classic/src/pages/Home/index.jsx`

## 功能

- 展示系统入口和 OpenAI-compatible 基址信息。
- 如果 root 在系统设置中配置了 `HomePageContent`，首页改为渲染该内容。
- `HomePageContent` 支持 Markdown/HTML；如果内容是 `https://` 开头的 URL，则作为外部页面地址加载，并向该页面发送当前主题和语言。
- 显示服务基址，来源优先级是 `status.server_address`，否则使用 `window.location.origin`。
- 提供复制基址动作。
- 展示可用数据平面端点名称：`/v1/chat/completions`、`/v1/responses`、`/v1/responses/compact`、`/v1/messages`、`/v1beta/models`、`/v1/images`。
- “获取密钥”入口跳转 `/console`；未登录用户会被 private route 导向 `/login`。
- 如果 `status.docs_link` 存在，提供外部文档入口。

## API

- `status`：由全局 `PageLayout` 加载，页面读取 `server_address`、`docs_link`、`SystemName` 等公开配置。
- `homePageContent` query：加载首页自定义内容。

## 本地状态

- `home_page_content`：localStorage 缓存上次加载的首页内容。
- 当前语言来自 i18n，影响内容 iframe 的 `postMessage` 语言值。
- 当前主题来自 `ThemeContext`，影响内容 iframe 的 `postMessage` 主题值。

## 新版实现注意

- 自定义内容为空时才显示默认首页功能。
- 不要把首页数据接回旧 REST API；内容和状态均来自 GraphQL。
- 如果保留外部 URL 内容能力，需要维持主题和语言通知。
