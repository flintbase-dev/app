# 我的消息

- 路由：`/console/messages`
- 标题：我的消息
- 访问：private。
- 当前实现：`web/classic/src/pages/Messages/index.jsx`

## 功能

- 展示当前用户收到的个人 Messages 和管理员 Broadcast。
- 支持按类型筛选：全部、Messages、Broadcast。
- 支持分页。
- 支持选择一条消息查看完整内容。
- 选择未读消息时自动标记为已读。
- 支持全部标记已读。
- 内容按 Markdown 渲染。

## API

- `inbox` query：参数 `p`、`page_size`、`type`，其中 `type` 可为 `all`、`message`、`broadcast`。
- `markInboxItemRead` mutation：输入 `item_type`、`id`。
- `markAllInboxRead` mutation。
- `inboxUnreadCount` query：当前页面未直接调用，但顶栏/其他入口可用于未读数。

## 数据字段

- `id`
- `item_type`
- `title`
- `content`
- `created_at`
- `read_at`

## 新版实现注意

- 消息 ID 需要和 `item_type` 一起作为前端唯一键。
- 切换类型时页码应回到第一页。
