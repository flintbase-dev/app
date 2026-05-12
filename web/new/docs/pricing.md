# 模型广场

- 路由：`/pricing`
- 标题：模型广场
- 访问：由 `status.HeaderNavModules.pricing.requireAuth` 决定；为 true 时需要登录，否则 public。
- 当前实现：`web/classic/src/pages/Pricing/index.jsx`、`web/classic/src/components/table/model-pricing/layout/PricingPage.jsx`、`web/classic/src/hooks/model-pricing/useModelPricingData.jsx`

## 功能

- 展示模型展示元数据、供应商、分组可用性、端点支持和价格。
- 支持搜索模型名称、描述、标签和供应商。
- 支持筛选：
  - 可用分组。
  - 计费类型。
  - 端点类型。
  - 供应商。
  - 标签。
- 支持按后端站点配置显示额度币种；仅作为显示单位，不做汇率换算。
- 支持切换 token 单位。
- 支持查看模型详情，包括基础信息、端点、价格拆解、分组与自动分组。
- 可复制模型名等文本。

## API

- `pricing` query：返回模型价格页面所需全部数据。
  - 常用响应字段：`data`、`vendors`、`group_ratio`、`usable_group`、`supported_endpoint`、`auto_groups`。
- `status` query：全局加载，页面读取 `quota_display_type` 作为站点展示币种。

## 本地状态

- `quota_display_type`：由后端站点配置决定页面显示币种，不在前端维护本地汇率或币种偏好。
- 页面内部维护搜索、筛选、分页、详情选中项、显示倍率开关和视图模式。

## 新版实现注意

- 模型广场只影响展示，不影响真实模型调用路由；真实调用配置在渠道管理。
- 价格展示需要兼容未设置供应商、未设置标签、不同端点类型和自动分组。
