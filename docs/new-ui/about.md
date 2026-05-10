# 关于

- 路由：`/about`
- 标题：关于
- 访问：public。
- 当前实现：`web/classic/src/pages/About/index.jsx`

## 功能

- 加载 root 配置的关于内容。
- 内容支持 Markdown/HTML。
- 如果内容以 `https://` 开头，则作为外部链接内容加载。
- 内容为空时，显示项目仓库、授权和版权相关默认说明。

## API

- `about` query：返回关于内容字符串。

## 本地状态

- `about`：localStorage 缓存上次加载内容。

## 新版实现注意

- 内容为空和加载失败是不同状态：空内容走默认说明，失败应提示错误。
