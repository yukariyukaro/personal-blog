# 博客发布内容

本目录是博客公开发布内容的唯一来源。`blog-content/` 下的其他知识文档不会进入网站构建产物。

每篇文章使用 Markdown 编写，并提供以下 Frontmatter：

```yaml
---
title: 文章标题
slug: stable-url-slug
summary: 文章摘要
publishedAt: 2026-08-29
category: 分类
tags:
  - 标签
---
```

约束：

- 文件名使用小写英文和连字符。
- `slug` 必须唯一，且发布后不随标题变化。
- `title`、`slug`、`summary`、`publishedAt`、`category` 和 `tags` 均为必填字段。
- `coverImage` 为可选字段。省略或留空时，文章列表与侧栏不会渲染图片区域。
- `coverImage` 可以使用站点 `public/` 下的根路径，也可以使用文章目录内的相对路径。
- 字段缺失或格式错误时构建失败，不生成默认内容。
- 文章字数和预计阅读时间由构建脚本从正文计算，不需要手写。
- 不要向本目录复制内部项目材料、私人信息或未经授权的内容。
