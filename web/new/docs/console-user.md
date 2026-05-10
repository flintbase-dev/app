# 用户管理

- 路由：`/console/user`
- 标题：用户管理
- 访问：admin。
- 当前实现：`web/classic/src/pages/User/index.jsx`、`web/classic/src/components/table/users/*`、`web/classic/src/hooks/users/useUsersData.jsx`

## 功能

- 分页展示用户。
- 支持按关键字和分组搜索。
- 支持编辑用户本地资料：用户名、显示名称、分组、备注。
- 展示 WorkOS 身份字段：WorkOS ID、邮箱、认证方式、组织 ID。
- 支持调整应用本地额度，模式包括增加、扣减、覆盖。
- 支持启用、禁用、提升、降级、删除等用户管理动作。
- 支持查看和管理指定用户的订阅记录。
- 支持表格紧凑模式和分页大小。

## API

- `users` query：列表，参数 `p`、`page_size`。
- `searchUsers` query：搜索，参数 `keyword`、`group`、`p`、`page_size`。
- `user` query：详情，必须传 `id`。
- `groups` query：用户分组候选。
- `updateUser` mutation：更新本地资料。
- `manageUser` mutation：用户动作；额度调整使用 `action: "add_quota"`，并传 `mode`、`value`。
- `deleteUser` mutation：删除用户，必须传 `id`。
- `adminSubscriptionPlans` query：用户订阅管理中加载套餐。
- `userSubscriptions` query：指定用户订阅，必须传用户 `id`。
- `createUserSubscription` mutation：为用户新增订阅，必须传用户 `id`，输入 `plan_id`。
- `invalidateUserSubscription` mutation：作废订阅，必须传订阅 `id`。
- `deleteUserSubscription` mutation：删除订阅，必须传订阅 `id`。

## 新版实现注意

- WorkOS 身份字段只读；本页管理的是应用本地用户资料和额度。
- 删除订阅会移除记录及权益明细；作废订阅保留历史记录。
