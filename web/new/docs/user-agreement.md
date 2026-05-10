# 用户协议

- 路由：`/user-agreement`
- 标题：用户协议
- 访问：public。
- 当前实现：`web/classic/src/pages/UserAgreement/index.jsx`、`web/classic/src/components/common/DocumentRenderer/index.jsx`

## 功能

- 读取并展示 root 配置的用户协议内容。
- 内容可以是 URL、HTML 或 Markdown。
- 内容为空时提示管理员未设置。
- HTML 内容会提取并注入其中的 `<style>` 内容，页面卸载时移除。

## API

- `userAgreement` query：返回用户协议内容字符串。

## 本地状态

- `user_agreement`：localStorage 缓存上次加载内容。

## 新版实现注意

- 文档渲染能力与隐私政策共用。
- 不需要登录。
