# 操练场

- 路由：`/console/playground`
- 标题：操练场
- 访问：private。
- 当前实现：`web/classic/src/pages/Playground/index.jsx`、`web/classic/src/hooks/playground/*`、`web/classic/src/components/playground/*`

## 功能

- 提供当前用户可用模型和分组的测试入口。
- 支持普通消息、系统消息、助手消息、消息编辑、角色切换、重发、复制、删除和清空对话。
- 支持图片输入；图片 URL 或粘贴的 base64 图片会写入最后一条用户消息的 OpenAI-compatible content array。
- 支持请求参数：`model`、`group`、`temperature`、`top_p`、`max_tokens`、`frequency_penalty`、`presence_penalty`、`seed`、`stream`。
- 支持单独开关各可选参数，未启用的参数不会进入请求体。
- 支持自定义请求体模式；该模式下直接解析用户输入的 JSON 并发送。
- 支持消息列表和自定义请求体双向同步。
- 支持流式和非流式请求。
- 支持停止流式生成，并把未完成的 assistant 消息收敛为完成态。
- 支持展示预览请求、实际请求、响应和 SSE 消息。
- 支持处理 `reasoning_content`、`reasoning` 和 `<think>...</think>` 内容。
- 支持导入、重置和自动保存操练场配置。

## API

- `userModels` query：加载当前用户可用模型列表。
- `selfGroups` query：加载当前用户可用分组。
- `POST /v1/chat/completions`：数据平面测试请求，不属于 GraphQL 控制面。
  - Header：`Content-Type: application/json`
  - Header：`New-Api-User: <localStorage user id>`
  - Body：OpenAI-compatible chat completions payload。

## 请求体生成规则

- 默认请求体包含：
  - `model`
  - `group`
  - `messages`
  - `stream`
- 如果有系统提示，系统消息插入到 `messages` 开头。
- 只有开启的参数才会进入请求体：
  - `temperature`
  - `top_p`
  - `max_tokens`
  - `frequency_penalty`
  - `presence_penalty`
  - `seed`
- 消息会过滤无效项，并通过 `formatMessageForAPI` 规范化。
- 图片模式开启时，最后一条用户消息会转换为文本加图片的多模态 content。
- 自定义请求体模式下，以用户 JSON 为准；解析失败时不发送请求。

## 本地状态

- `playground_config`：保存模型、分组、参数开关、调试面板开关、自定义请求体模式等配置。
- `playground_messages`：保存消息列表。
- `user`：用于读取用户 ID、用户名和分组。

## 新版实现注意

- 控制面数据仍走 GraphQL；模型实际调用测试走 `/v1/chat/completions`。
- 不要把操练场测试请求改接 `/api/graphql`。
- 流式请求需要保留 SSE 原始消息记录，便于调试。
- 页面首次加载时，如果最后一条消息仍是 loading 或 incomplete，需要修复为完成态，避免恢复旧会话后一直显示生成中。
