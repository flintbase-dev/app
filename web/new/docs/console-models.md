# 模型管理

- 路由：`/console/models`
- 标题：模型管理
- 访问：admin。
- 当前实现：`web/classic/src/pages/Model/index.jsx`、`web/classic/src/components/table/models/*`、`web/classic/src/hooks/models/useModelsData.jsx`

## 功能

- 分页展示模型展示元数据，支持按供应商筛选。
- 支持按模型名称和供应商关键字搜索。
- 支持新增、编辑、启用、禁用、删除模型元数据。
- 支持批量选择模型、批量删除、复制模型名、把已选模型写入预填组。
- 支持管理供应商：新增、编辑、删除供应商。
- 支持查看渠道中存在但未配置展示元数据的模型，并从缺失模型直接进入配置。
- 支持同步官方上游模型与供应商元数据，包含预览冲突、同步缺失项、选择性覆盖冲突项。
- 支持管理预填组，预填组类型包括模型组、标签组、端点组。
- 支持表格紧凑模式、分页大小和当前页切换。

## API

- `vendors` query：加载供应商列表，常用 `page_size: 1000`。
- `vendor` query：供应商详情，必须传 `id`。
- `createVendor` mutation：创建供应商。
- `updateVendor` mutation：更新供应商。
- `deleteVendor` mutation：删除供应商，必须传 `id`。
- `modelsMeta` query：模型元数据列表，参数 `p`、`page_size`。
- `searchModelsMeta` query：模型元数据搜索，参数 `keyword`、`vendor`、`p`、`page_size`。
- `modelMeta` query：模型详情，必须传 `id`。
- `createModelMeta` mutation：创建模型元数据。
- `updateModelMeta` mutation：更新模型元数据；状态开关使用 `{ input, params: { status_only: true } }`。
- `deleteModelMeta` mutation：删除模型，必须传 `id`。
- `missingModels` query：查询渠道中出现但未配置展示元数据的模型。
- `syncUpstreamPreview` query：预览官方元数据同步结果，可传 `locale`。
- `syncUpstreamModels` mutation：执行官方元数据同步，可传 `locale` 和 `overwrite`。
- `prefillGroups` query：预填组列表，可用 `type` 过滤。
- `createPrefillGroup` mutation：创建预填组。
- `updatePrefillGroup` mutation：更新预填组。
- `deletePrefillGroup` mutation：删除预填组，必须传 `id`。

## 模型字段

- `model_name`：模型名称。
- `description`：模型说明。
- `icon`：模型图标标识。
- `tags`：逗号分隔或数组形式的标签，提交前会转为逗号分隔字符串。
- `vendor_id` / `vendor` / `vendor_icon`：供应商关联和展示字段。
- `endpoints`：端点 JSON 字符串。
- `name_rule`：名称匹配规则，`0` 精确、`1` 前缀、`2` 包含、`3` 后缀。
- `status`：`1` 启用，`0` 禁用。
- `sync_official`：是否允许官方同步覆盖该模型。

## 供应商字段

- `name`
- `description`
- `icon`
- `status`：`1` 启用，`0` 禁用。

## 预填组字段

- `name`
- `description`
- `type`：`model`、`tag` 或 `endpoint`。
- `items`：模型组和标签组使用数组；端点组使用对象映射。

## 新版实现注意

- 本页配置只影响模型广场展示和模型元数据，不影响真实模型调用与路由。
- 真实调用能力、上游地址、密钥和模型可用性来自渠道管理。
- 同步官方元数据必须保留“预览冲突”和“应用覆盖”两个步骤，避免直接覆盖人工维护内容。
