# 公开广播

- 路由：`/broadcasts`
- 标题：公开广播
- 访问：public。
- 当前实现：`web/classic/src/pages/Broadcasts/index.jsx`

## 功能

- 分页展示面向用户和访客发布的 Broadcast。
- 默认选中当前页第一条 Broadcast。
- 支持选择一条 Broadcast 查看完整内容。
- Broadcast 内容按 Markdown 渲染。
- 展示发送时间。

## API

- `publicBroadcasts` query
  - `p`：页码。
  - `page_size`：固定使用 `10`。
  - 返回 `data.items` 和 `data.total`。

## 数据字段

- `id`
- `title`
- `content`
- `sent_at`

## 新版实现注意

- 该页面无需登录，不能依赖 `UserContext`。
- 选中项需要在分页刷新后重新校验是否仍存在。
