# 数据看板

- 路由：`/console`
- 标题：数据看板
- 访问：private。
- 当前实现：`web/classic/src/pages/Dashboard/index.jsx`、`web/classic/src/components/dashboard/index.jsx`、`web/classic/src/hooks/dashboard/*`

## 功能

- 展示当前用户账户数据：余额、历史消耗、请求次数。
- 展示所选时间范围内的统计数据：统计次数、统计额度、统计 tokens、平均 RPM、平均 TPM。
- 支持按时间范围、时间粒度筛选统计；管理员可额外按用户名筛选。
- 展示模型调用次数占比、模型消耗分布、调用趋势、模型排行；管理员还会加载用户维度排行和趋势。
- 可刷新当前统计。
- 可读取并展示 `status.api_info`、`status.faq`、Uptime Kuma 状态；这些区域由 `status` 中的开关控制。
- API 信息支持复制 URL、打开 URL 和发起测速。

## API

- `self` query：刷新当前用户资料。
- `quotaDatesSelf` query：普通用户用量时间序列。
- `quotaDates` query：管理员按用户筛选的模型用量时间序列。
- `quotaDatesByUser` query：管理员用户维度用量时间序列。
- `uptimeStatus` query：服务可用性状态。
- `status` query：全局加载，用于读取 API 信息、FAQ、开关和模块配置。

## 关键参数

- `start_timestamp`、`end_timestamp`：秒级时间戳。
- `default_time`：时间粒度，当前可取 `hour`、`day`、`week`。
- `username`：管理员筛选用。

## 新版实现注意

- 普通用户和管理员在同一页面使用不同查询分支。
- `DataExportDefaultTime` 同时由系统设置和 localStorage 默认值影响。
- Uptime 与 FAQ/API 信息可以被 root 设置隐藏。
