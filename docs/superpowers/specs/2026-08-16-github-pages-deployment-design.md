# GitHub Pages 部署设计

## 目标

将 `apps/web` 的 Vite 静态站点通过 GitHub Actions 部署到 GitHub Pages，并保留自定义域名 `blog.mmmiku.com`。

## 方案

采用 GitHub Pages 官方 Actions 制品部署：

1. `master` 分支推送或手动触发工作流。
2. 在 `apps/web` 安装锁定依赖并执行生产构建。
3. 上传 `apps/web/dist` 为 Pages 制品。
4. 通过 `actions/deploy-pages` 发布到 `github-pages` 环境。

不维护 `gh-pages` 分支，不将构建产物提交到 Git。

## 工作流

工作流位于 `.github/workflows/deploy-pages.yml`，包含顺序执行的 `build` 和 `deploy` 任务。

### build

- 检出仓库。
- 安装与锁文件兼容的 pnpm。
- 安装 Node.js LTS，并启用 pnpm 缓存。
- 在 `apps/web` 执行 `pnpm install --frozen-lockfile`。
- 执行 `pnpm run build`。
- 配置 GitHub Pages 并上传 `apps/web/dist`。

### deploy

- 等待 `build` 成功。
- 发布 Pages 制品。
- 将部署地址写入 `github-pages` 环境。

## 权限与并发

工作流仅授予：

- `contents: read`
- `pages: write`
- `id-token: write`

使用 `pages` 并发组。同一时间只保留最新部署，避免旧提交覆盖新提交。

## 域名与路径

- 保留 `apps/web/CNAME` 作为 Vite 使用根路径 `base` 的构建标记。
- 自定义 Actions 工作流会忽略制品中的 `CNAME`。域名必须在 GitHub Pages 设置中配置为 `blog.mmmiku.com`。
- GitHub Pages 发布源设置为 GitHub Actions。
- DNS 解析不由工作流修改；现有 DNS 必须指向 GitHub Pages。

## 失败处理

- 安装、类型检查或构建失败时，不上传、不部署。
- Pages 设置未启用 GitHub Actions 时，在仓库设置页完成启用后重跑工作流。
- Pages 未绑定自定义域名时，部署地址会回退到项目路径，与根路径构建不匹配；必须先修正 Pages 设置。
- 自定义域名不可访问时，分别检查 Actions、Pages 域名状态和 DNS，避免将 DNS 故障误判为构建故障。

## 验收

- 本地 `pnpm run build` 成功。
- 工作流语法有效，推送到 `master` 后执行成功。
- Pages 设置显示发布源为 GitHub Actions，自定义域名为 `blog.mmmiku.com`。
- `https://blog.mmmiku.com/` 返回成功响应，首页脚本和关键静态资源可加载。
