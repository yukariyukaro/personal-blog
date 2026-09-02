# Personal Blog Monorepo

本仓库包含博客网站和内容：

```text
.
├── apps/
│   └── web/            # React + Vite 网站
└── blog-content/
    └── posts/          # 公开发布的 Markdown 内容
```

## 内容发布

`blog-content/posts/` 是博客公开内容的唯一来源。网站构建前会校验文章 Frontmatter，并生成：

```text
apps/web/public/content/
├── index.json
└── articles/
    └── <slug>.md
```

该目录是生成产物，不提交到 Git。Vite 会在构建时将其复制到 `dist/content/`，GitHub Pages 通过普通 HTTP GET 提供内容。

## Web 应用

```bash
pnpm --dir apps/web install
pnpm --dir apps/web dev
pnpm --dir apps/web build
```

`apps/web` 保持独立构建，不依赖根目录的包管理配置。

## 公开边界

当前 GitHub Pages 来源仓库为公开仓库。只有经过审查的 `blog-content/posts/` 会进入网站构建产物，其他本地知识库内容不属于本仓库的公开发布范围。
