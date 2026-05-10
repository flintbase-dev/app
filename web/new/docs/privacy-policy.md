# 隐私政策

- 路由：`/privacy-policy`
- 标题：隐私政策
- 访问：public。
- 当前实现：`web/classic/src/pages/PrivacyPolicy/index.jsx`、`web/classic/src/components/common/DocumentRenderer/index.jsx`

## 功能

- 读取并展示 root 配置的隐私政策内容。
- 内容可以是 URL、HTML 或 Markdown。
- 内容为空时提示管理员未设置。
- HTML 内容会提取并注入其中的 `<style>` 内容，页面卸载时移除。

## API

- `privacyPolicy` query：返回隐私政策内容字符串。

## 本地状态

- `privacy_policy`：localStorage 缓存上次加载内容。

## 新版实现注意

- 与用户协议保持同一套渲染和缓存行为。
