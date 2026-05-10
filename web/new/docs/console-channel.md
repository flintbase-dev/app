# 渠道管理

- 路由：`/console/channel`
- 标题：渠道管理
- 访问：admin。
- 当前实现：`web/classic/src/pages/Channel/index.jsx`、`web/classic/src/components/table/channels/*`、`web/classic/src/hooks/channels/*`

## 功能

- 分页展示渠道，支持按渠道类型、状态、标签聚合模式过滤。
- 支持按渠道 ID、名称、密钥、API 地址、模型关键字、分组搜索。
- 支持 ID 排序、分页大小、列显示、紧凑模式。
- 支持新增、编辑、复制、删除渠道。
- 支持启用、禁用、按标签启用/禁用、批量删除、批量设置标签。
- 支持更新单个或全部渠道余额。
- 支持测试单个渠道、测试指定模型、批量测试一个渠道的模型、测试所有未手动禁用渠道。
- 支持查看 root-only 渠道密钥。
- 支持修复渠道能力数据一致性。
- 支持多密钥管理。
- 支持检测和应用单个或全部渠道的上游模型更新。
- 如果全局请求透传启用，需要提示内置参数覆写、模型重定向、渠道适配等能力会失效。

## 渠道类型

当前 UI 支持的主要类型：

- `1` OpenAI
- `14` Anthropic Claude
- `33` AWS Claude
- `41` Vertex AI
- `3` Azure OpenAI
- `24` Google Gemini

支持拉取上游模型列表的类型：`1`、`14`、`24`、`33`、`41`、`3`。

## API

- `channels` query：列表，参数 `p`、`page_size`、`id_sort`、`tag_mode`、可选 `type`、`status`。
- `searchChannels` query：搜索，参数 `keyword`、`group`、`model`、分页和过滤条件。
- `channel` query：详情，必须传 `id`。
- `channelModels` query：渠道编辑时的模型候选。
- `enabledChannelModels` query：未设置价格模型等页面复用。
- `groups` query：分组候选。
- `prefillGroups` query：模型预填组。
- `channelKey` mutation：查看密钥，必须传 `id`，需要 root。
- `createChannel` mutation：创建渠道。
- `updateChannel` mutation：更新渠道。
- `deleteChannel` mutation：删除单个渠道，必须传 `id`。
- `deleteChannels` mutation：批量删除，输入 `ids`。
- `copyChannel` mutation：复制渠道，必须传 `id`。
- `enableTagChannels` / `disableTagChannels` mutation：按标签启用/禁用。
- `editTagChannels` mutation：按标签批量编辑字段。
- `batchSetChannelTag` mutation：输入 `ids`、`tag`。
- `testChannel` mutation：必须传 `id`，常用 `params.model`、`params.endpoint_type`、`params.stream`。
- `testAllChannels` mutation。
- `updateChannelBalance` mutation：必须传 `id`。
- `updateAllChannelBalance` mutation。
- `deleteDisabledChannels` mutation。
- `fixChannelsAbilities` mutation。
- `fetchUpstreamModels` mutation：必须传 `id`。
- `fetchModels` mutation：root-only。
- `tagModels` query：参数 `tag`。
- `manageMultiKeys` mutation。
- `detectChannelUpstreamUpdates` / `detectAllChannelUpstreamUpdates` mutation。
- `applyChannelUpstreamUpdates` / `applyAllChannelUpstreamUpdates` mutation。

## 渠道编辑字段

- 核心：`type`、`name`、`key`、`base_url`、`models`、`groups`、`test_model`。
- Azure：`base_url` 作为 `AZURE_OPENAI_ENDPOINT`，`other` 为默认 API version，`azure_responses_version` 为 Responses API version。
- AWS Claude：`aws_key_type` 可选 `ak_sk` 或 `api_key`，密钥格式随模式变化。
- Vertex AI：`vertex_key_type` 可选 `json` 或 `api_key`；JSON 模式支持文件上传或手动 JSON。
- 多密钥：`key_mode`、`multi_key_mode`。
- 模型处理：`model_mapping`、`custom_model`。
- 调度：`priority`、`weight`、`auto_ban`、`tag`。
- 请求控制：`header_override`、`status_code_mapping`、`proxy`、`system_prompt`、`system_prompt_override`、`pass_through_body_enabled`、`thinking_to_content`、`force_format`。
- 透传开关：`allow_service_tier`、`disable_store`、`allow_safety_identifier`、`allow_include_obfuscation`、`allow_inference_geo`、`allow_speed`。
- 上游模型更新：`upstream_model_update_check_enabled`、`upstream_model_update_auto_sync_enabled`、`upstream_model_update_ignored_models`。
- 备注：`remark`。

## 新版实现注意

- 渠道管理是真实调用路由的配置源；不要把模型广场配置误用为真实路由。
- `channelKey` 和 `fetchModels` 需要 root 权限，即使页面整体是 admin。
- 上游模型更新支持“检测”和“应用”两步，单渠道和全量渠道都要覆盖。
