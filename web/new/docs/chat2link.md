# Chat2Link 跳转页

- 路由：`/chat2link`
- 标题：无固定标题；页面文案为“正在加载，请稍候...”。
- 访问：private。
- 当前实现：`web/classic/src/pages/Chat2Link/index.jsx`、`web/classic/src/hooks/chat/useTokenKeys.js`、`web/classic/src/helpers/token.js`

## 功能

- 加载当前用户启用令牌，并取第一个启用令牌的真实 key。
- 读取服务地址，用于写入目标聊天客户端配置。
- 目标跳转 URL 形态为：
  - `${chatLink}/#/?settings={"key":"sk-${key}","url":"${encodeURIComponent(serverAddress)}"}`
- 如果没有启用令牌，会提示错误并在短延迟后跳转 `/console/token`。

## 当前实现状态

- 页面从 `useTokenKeys()` 解构 `chatLink`，但当前 hook 实际只返回 `keys`、`serverAddress`、`isLoading`。
- 因此当前代码不会生成有效 `redirectLink`，页面会停留在加载文案。
- 旧的 `chat_link` / `chat_link2` localStorage 写入逻辑已经被注释，不应作为新版实现依赖。

## API

- `tokens` query：加载当前用户令牌列表，当前实现传 `p: 1`、`size: 10`。
- `tokenKey` mutation：获取单个令牌真实 key，必须传 `id`。

## 本地状态

- `status`：服务地址缓存。
- `user`：用于用户会话和令牌 API 鉴权。

## 新版实现注意

- 如果新版 UI 继续保留该页，需要重新定义 `chatLink` 的来源，例如从 `Chats` 配置选择一个外部跳转模板。
- 不要恢复旧 `chat_link` / `chat_link2` 兼容字段；当前系统是 fresh deploy only。
- 真实令牌密钥必须继续通过 `tokenKey` 按需获取。
