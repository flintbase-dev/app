# 系统初始化

- 路由：`/setup`
- 标题：系统初始化
- 访问：public。
- 当前实现：`web/classic/src/pages/Setup/index.jsx`、`web/classic/src/components/setup/SetupWizard.jsx`

## 功能

- 显示当前初始化状态。
- 告知数据库迁移和初始数据写入由独立 migrator 完成，主应用不执行迁移或创建初始管理员。
- 展示数据库类型、数据库迁移状态和管理员账号初始化状态。
- 提供重新检查初始化状态动作。
- 如果初始化已完成，自动跳转首页 `/`。
- 全局 `SetupCheck` 在 `status.setup === false` 且当前不是 `/setup` 时会导向本页。

## API

- `setup` query：返回 `{ status, root_init }`。
- `status` query：由全局布局加载，用于触发初始化检查。

## 新版实现注意

- 不要在 UI 中尝试执行迁移。
- 不要提供旧数据库类型或旧初始化流程的兼容入口；当前部署目标是 PostgreSQL fresh deploy。
