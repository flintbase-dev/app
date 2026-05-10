# WorkOS 登录

- 路由：`/login`
- 标题：登录
- 访问：public。
- 当前实现：`web/classic/src/components/auth/WorkOSLogin.jsx`

## 功能

- 页面挂载后立即请求 WorkOS 登录地址并跳转。
- 固定传入 `return_to: "/workos/callback"`。
- 支持 URL 参数：
  - `aff`：邀请来源，透传给登录操作。
  - `screen_hint`：登录/注册提示，透传给登录操作。
- 失败时显示错误信息。

## API

- `workosLogin` mutation：使用 `API.redirect` 执行，变量形态为 `{ params: { return_to, aff?, screen_hint? } }`。
- 成功响应需要包含 `data.location`，客户端用它执行 `window.location.assign`。

## 新版实现注意

- 登录身份由 WorkOS Hosted UI 提供。
- 不要重新引入用户名密码、注册、找回密码或旧 token 登录表单。
