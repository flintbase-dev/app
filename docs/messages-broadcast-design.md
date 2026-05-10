# Messages + Broadcast 设计开发文档

## 目标

当前系统使用 `Messages` 和 `Broadcast` 两类站内消息：

- `Messages`：发给单个用户的非敏感通知。任何通过通知系统发给单人的邮件类通知，都会同步生成一条 `Messages` 记录。包含验证码、登录码、一次性验证链接等敏感内容的邮件不能生成 `Messages`。
- `Broadcast`：管理员手动发送的多人通知。可以面向指定用户、用户分组、用户等级、全体用户，或用户 + 访客。管理员可以选择是否同时发送邮件。

旧的 `Notice` 弹窗公告和 dashboard 系统公告配置已经移除。

## 数据模型

### `messages`

单人消息表，用户在“我的消息”中查看。

关键字段：

- `id`：`msg_` 前缀 typed NanoID。
- `user_id`：接收用户。
- `title` / `content`：消息标题和正文。
- `notification_type`：来源通知类型，例如 `quota_exceed`、`channel_update`。
- `delivery_channel`：固定为 `email`。所有通知邮件都发送到用户账户邮箱。
- `delivery_status`：`pending`、`sent`、`skipped`、`failed`。
- `read_at`：0 表示未读。

新增单人通知时，优先使用 `service.NotifyUser(...)`。默认会创建 `Messages`；敏感邮件必须使用 `dto.NewSensitiveNotify(...)` 或绕过该通知路径。

### `broadcasts`

管理员发送的 Broadcast 主表。

关键字段：

- `id`：`brd_` 前缀 typed NanoID。
- `audience_type`：`selected`、`all_users`、`users_and_guests`。
- `audience`：JSON 字符串，保存 `user_ids`、`groups`、`roles`。
- `email_enabled`：是否发送邮件。
- `recipient_count` / `email_sent_count` / `email_failed_count`：发送结果统计。
- `sent_at`：发送时间。

### `broadcast_read_receipts`

Broadcast 已读回执表，按用户记录。

关键字段：

- `id`：`brr_` 前缀 typed NanoID。
- `broadcast_id`
- `user_id`
- `read_at`

## API

所有前端控制面 API 仍走 `/api/graphql` 操作注册。

用户侧：

- `inbox`：分页读取当前用户的 `Messages` 和可见 `Broadcast`。
- `inboxUnreadCount`：当前用户未读数。
- `markInboxItemRead`：标记单条消息已读。
- `markAllInboxRead`：标记全部已读。

访客侧：

- `publicBroadcasts`：读取 `audience_type = users_and_guests` 的公开 Broadcast。对应页面为 `/broadcasts`。

管理员侧：

- `adminBroadcasts`：分页查看已发送 Broadcast。
- `createBroadcast`：发送 Broadcast，可选择是否邮件投递。
- `deleteBroadcast`：删除 Broadcast。

## 前端入口

- 用户侧边栏：`我的消息`，路径 `/console/messages`。
- 管理员侧边栏：`消息管理`，路径 `/console/message-management`。
- 访客公开页：`/broadcasts`，顶栏显示为“公开广播”。

## 后续增加 Messages 的规则

1. 非敏感、单用户通知：使用 `service.NotifyUser(...)`，并传入明确的 `dto.Notify.Type`。
2. 敏感邮件：使用 `dto.NewSensitiveNotify(...)`，或直接走专用敏感邮件发送路径，不写入 `messages`。
3. 多人通知：不要循环创建 `Messages` 当公告用，使用 `Broadcast`。
4. Broadcast 需要访客可见时，必须使用 `audience_type = users_and_guests`。
5. 新通知类型需要在文档中记录类型名、触发场景、是否允许站内留存、是否允许邮件投递。
