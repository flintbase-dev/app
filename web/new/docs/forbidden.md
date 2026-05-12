# 禁止访问

- 路由：`/forbidden`
- 标题：无权访问
- 访问：public；通常由 `AdminRoute` 在权限不足时跳转。
- 当前实现：`web/classic/src/pages/Forbidden/index.jsx`

## 功能

- 告知当前用户无权访问目标页面。
- 不执行数据加载。

## API

- 无页面专属 API。

## 新版实现注意

- 管理员页权限不足时应跳转到本页，而不是静默返回首页。
