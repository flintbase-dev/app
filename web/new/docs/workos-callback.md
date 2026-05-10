# WorkOS 回调

- 路由：`/workos/callback`
- 标题：WorkOS 回调
- 访问：public；实际依赖 WorkOS 回调建立的后端 session。
- 当前实现：`web/classic/src/components/auth/WorkOSCallback.jsx`

## 功能

- 页面挂载后调用当前用户接口验证 WorkOS session 是否建立。
- 成功时：
  - 把用户对象写入 `UserContext`。
  - 把用户对象写入 localStorage `user`。
  - 重建 GraphQL API client。
  - 跳转 `/console`。
- 失败时：
  - 清理 localStorage `user`。
  - 重建 GraphQL API client。
  - 跳转 `/login`。

## API

- `self` query：用于读取当前用户。该请求设置 `skipErrorHandler: true`，避免全局错误处理干扰登录回调流程。

## 新版实现注意

- 后端协议回调是 `/api/workos/callback`，前端页面路由是 `/workos/callback`。
- 不要把 WorkOS callback 当作 GraphQL operation 实现。
