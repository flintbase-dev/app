# 消息管理

- 路由：`/console/message-management`
- 标题：消息管理
- 访问：admin。
- 当前实现：`web/classic/src/pages/MessageManagement/index.jsx`

## 功能

- 分页展示管理员发送的 Broadcast。
- 支持发送新的 Broadcast。
- 发送时可指定目标范围：
  - 全体用户。
  - 指定用户 ID、分组或用户等级。
  - 用户 + 访客。
- 支持选择是否同时发送邮件。
- 支持删除 Broadcast；删除后用户和访客不再看到该 Broadcast。
- 展示邮件发送数量和接收者数量。

## API

- `adminBroadcasts` query：参数 `p`、`page_size`。
- `groups` query：加载分组选项。
- `createBroadcast` mutation：
  - `title`
  - `content`
  - `audience_type`
  - `audience`，含 `user_ids`、`groups`、`roles`。
  - `email_enabled`
- `deleteBroadcast` mutation：必须传 `id`。

## 角色值

- `1`：普通用户。
- `10`：管理员。
- `100`：超级管理员。

## 新版实现注意

- `selected` 目标范围必须至少包含一个用户 ID、分组或角色。
- 内容支持 Markdown，公开展示页和用户消息页都会渲染它。
