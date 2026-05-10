# 聊天集成页

- 路由：`/console/chat/:id?`
- 标题：聊天
- 访问：当前路由定义没有包裹 `PrivateRoute`；实际功能依赖用户会话，因为会调用用户令牌 API。
- 当前实现：`web/classic/src/pages/Chat/index.jsx`、`web/classic/src/hooks/chat/useTokenKeys.js`、`web/classic/src/helpers/token.js`

## 功能

- 按 `id` 从 `localStorage.chats` 中选择一个聊天客户端 URL 模板。
- 自动加载当前用户前 10 个令牌，筛选 `status === 1` 的启用令牌。
- 对第一个启用令牌调用 `tokenKey` 获取真实 key。
- 使用服务地址和真实 key 替换聊天 URL 模板变量。
- 将生成后的聊天 URL 作为外部聊天客户端地址加载。
- 如果没有启用令牌，会提示错误并在短延迟后跳转 `/console/token`。

## URL 模板规则

- `localStorage.chats` 来源于 `status.chats`，由系统设置中的 `Chats` 选项配置。
- 数据格式是数组，数组项是 `{ 名称: URL模板 }`。
- 当前页面按数组下标读取：`/console/chat/0` 对应第一项。
- 模板替换：
  - `{address}` 替换为 URL 编码后的服务地址。
  - `{key}` 替换为 `sk-` 加真实令牌 key。
- 服务地址来源优先级：`localStorage.status.server_address`，否则 `window.location.origin`。

## API

- `tokens` query：加载当前用户令牌列表，当前实现传 `p: 1`、`size: 10`。
- `tokenKey` mutation：获取单个令牌真实 key，必须传 `id`。

## 本地状态

- `chats`：聊天客户端 URL 模板数组。
- `status`：服务地址缓存。
- `user`：用于用户会话和令牌 API 鉴权。

## 新版实现注意

- 该页面依赖真实令牌密钥，不能从令牌列表直接读取 key。
- `id` 为空时当前实现不会生成聊天地址；新版实现应明确处理默认项或给出可恢复提示。
- 侧边栏会过滤 `fluent`、`ccswitch`、`deepchat` 开头的模板，不把这些模板作为内嵌聊天页入口。
- 如果保持当前安全边界，建议将此路由也按 private 页面处理，因为无登录时无法完成令牌加载。
