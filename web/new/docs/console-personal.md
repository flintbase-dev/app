# 个人设置

- 路由：`/console/personal`
- 标题：个人设置
- 访问：private。
- 当前实现：`web/classic/src/components/settings/PersonalSetting.jsx`、`web/classic/src/components/settings/personal/*`

## 功能

- 展示当前用户的用户名、角色、ID、余额、历史消耗、请求次数和用户分组。
- 展示 WorkOS ID、邮箱和认证方式。
- 支持重置系统访问令牌；新令牌返回后立即复制。
- 支持删除当前账户；删除前要求输入当前用户名确认。
- 支持语言偏好设置，并同步到 i18n、localStorage 和后端用户资料。
- 支持通知设置：账户邮箱、额度预警阈值、管理员上游模型更新通知。
- 支持价格偏好：是否接受未设置价格的模型。
- 支持隐私偏好：消费日志和错误日志是否记录客户端 IP。
- 如果当前用户具备边栏设置权限，支持个人侧边栏模块开关，并受管理员全局侧边栏配置约束。
- 当前代码包含每日签到组件能力；该组件依赖 `status.checkin_enabled`、`checkinStatus`、`checkin` 和 hCaptcha 配置。当前挂载未传入这些 props，新版实现如保留签到功能需要显式接入。

## API

- `status` query：加载公开状态，用于 hCaptcha、签到等功能开关。
- `self` query：加载当前用户资料、权限和个人侧边栏配置。
- `generateAccessToken` mutation：重置当前用户系统访问令牌。
- `deleteSelf` mutation：删除当前用户账号。
- `updateSelf` mutation：更新当前用户资料和偏好；当前页面用于 `language`、`sidebar_modules` 等字段。
- `updateUserSetting` mutation：更新当前用户设置 JSON，当前页面使用：
  - `quota_warning_threshold`
  - `upstream_model_update_notify_enabled`
  - `accept_unset_model_price_model`
  - `record_ip_log`
- `checkinStatus` query：签到状态，参数 `month`，格式 `YYYY-MM`。
- `checkin` mutation：执行签到；hCaptcha 开启时通过 `params.hcaptcha` 传验证码。

## 本地状态

- `user`：localStorage 中的当前用户资料，也是 `UserContext` 恢复来源。
- `i18nextLng`：当前语言。
- `status`：公开状态缓存，用于服务配置和 hCaptcha 配置。
- `sidebar_modules`：保存在用户资料中的个人侧边栏配置 JSON。

## 用户设置字段

- `language`：界面语言，支持 `zh-CN`、`zh-TW`、`en`、`fr`、`ru`、`ja`、`vi`。
- `quota_warning_threshold`：额度预警阈值。
- `upstream_model_update_notify_enabled`：管理员是否接收上游模型更新通知。
- `accept_unset_model_price_model`：允许调用未设置价格的模型。
- `record_ip_log`：记录请求与错误日志 IP。
- `sidebar_modules`：个人侧边栏模块开关。

## 新版实现注意

- 身份由 WorkOS 提供，本页只管理本地偏好、应用令牌和账号删除。
- 删除账号成功后需要清理 `UserContext`、localStorage 中的 `user`，并跳转 `/login`。
- 个人侧边栏设置需要同时考虑后端权限、管理员全局配置和用户个人配置。
