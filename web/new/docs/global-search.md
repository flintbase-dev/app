# 全局搜索

- 入口：控制台顶部搜索框。
- 路由：`/console/search?q=...`
- 访问：private。

## 当前实现

全局搜索通过一个 GraphQL query 同时拉取多个可搜索域，避免把同一次搜索拆成多个网络请求。

当前字段：

- `pricing`：在前端按关键字过滤模型、供应商、标签和说明。
- `userLogs`：搜索当前用户请求记录，优先按 `request_id` 过滤。
- `userTopups`：搜索当前用户 Stripe Invoice 账单。
- `searchTokens`：搜索当前用户 API key。

## 扩展新搜索域

1. 在 `web/new/lib/console/data.ts` 的 `loadGlobalSearchResults` 中增加一个 GraphQL 字段。
2. 复用已有 normalize 函数，或新增一个只返回搜索结果摘要的 normalize 函数。
3. 在 `web/new/app/console/search/page.tsx` 增加结果分区。
4. 如果后端已有专用 search query，应直接加入同一个 GraphQL query；不要在前端为同一次搜索发起第二个请求。

## 后端约束

- 浏览器控制面只调用 `POST /api/graphql`。
- 用户级搜索必须使用 user-scope query，例如 `userLogs`、`userTopups`、`searchTokens`。
- admin-only search query 只能用于已实现的 admin 页面；不要为了全局搜索扩大普通用户权限。
