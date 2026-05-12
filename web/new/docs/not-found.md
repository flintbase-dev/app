# 页面未找到

- 路由：`*`
- 标题：页面未找到
- 访问：public。
- 当前实现：`web/classic/src/pages/NotFound/index.jsx`

## 功能

- 在没有匹配路由时提示浏览器地址不正确。
- 不执行数据加载。

## API

- 无页面专属 API。

## 新版实现注意

- 保留 catch-all route，避免未知路径落入空白页面。
