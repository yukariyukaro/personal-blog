# GitHub Pages 部署实施计划

> **供智能体执行：** 必须使用 `superpowers:executing-plans` 或 `superpowers:subagent-driven-development`，按任务逐项实施并更新复选框。

**目标：** 为 `apps/web` 增加 GitHub Actions 工作流，将生产制品部署到 GitHub Pages，并保留 `blog.mmmiku.com`。

**架构：** 工作流在 `master` 推送或手动触发时构建 `apps/web`，再通过 GitHub Pages 官方制品 Actions 发布。构建与部署拆成两个任务，部署只在构建和制品上传成功后执行；发布源和自定义域名在 GitHub Pages 设置中维护。

**技术栈：** GitHub Actions、pnpm、Node.js LTS、Vite、GitHub Pages

---

### 任务 1：建立工作流配置契约

**文件：**
- 创建：`.github/workflows/deploy-pages.yml`

- [x] **步骤 1：验证工作流尚不存在**

运行：

```bash
test -f .github/workflows/deploy-pages.yml
```

预期：退出码非零，证明部署工作流尚未实现。

- [x] **步骤 2：创建最小完整工作流**

写入 `.github/workflows/deploy-pages.yml`：

```yaml
name: 部署 GitHub Pages

on:
  push:
    branches:
      - master
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: apps/web
    steps:
      - name: 检出仓库
        uses: actions/checkout@v6

      - name: 安装 pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 10.33.2
          run_install: false

      - name: 安装 Node.js
        uses: actions/setup-node@v6
        with:
          node-version: 24
          cache: pnpm
          cache-dependency-path: apps/web/pnpm-lock.yaml

      - name: 安装依赖
        run: pnpm install --frozen-lockfile

      - name: 构建网站
        run: pnpm run build

      - name: 配置 GitHub Pages
        uses: actions/configure-pages@v5

      - name: 上传 GitHub Pages 制品
        uses: actions/upload-pages-artifact@v4
        with:
          path: apps/web/dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: 部署 GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

- [x] **步骤 3：校验 YAML 可解析**

运行：

```bash
ruby -e "require 'yaml'; YAML.load_file('.github/workflows/deploy-pages.yml'); puts 'YAML OK'"
```

预期：输出 `YAML OK`。

### 任务 2：验证构建与 Pages 制品

**文件：**
- 验证：`apps/web/pnpm-lock.yaml`
- 验证：`apps/web/dist/index.html`

- [x] **步骤 1：验证冻结依赖安装**

运行：

```bash
pnpm install --frozen-lockfile
```

工作目录：`apps/web`

预期：退出码为 0，锁文件未被修改。

- [x] **步骤 2：执行生产构建**

运行：

```bash
pnpm run build
```

工作目录：`apps/web`

预期：退出码为 0，生成 `apps/web/dist`。

- [x] **步骤 3：验证自定义域名构建使用根路径资源**

运行：

```bash
rg -n 'src="/assets/|href="/assets/' dist/index.html
```

工作目录：`apps/web`

预期：退出码为 0，生产 HTML 使用适配 `blog.mmmiku.com` 的根路径资源。

- [x] **步骤 4：检查差异**

运行：

```bash
git diff --check
git status --short
```

预期：无空白错误，只出现实施计划和工作流文件。

### 任务 3：提交并触发部署

**文件：**
- 提交：`.github/workflows/deploy-pages.yml`
- 提交：`docs/superpowers/plans/2026-08-16-github-pages-deployment.md`

- [ ] **步骤 1：提交实现**

运行：

```bash
git add .github/workflows/deploy-pages.yml docs/superpowers/plans/2026-08-16-github-pages-deployment.md
git commit -m "ci: 部署网站到 GitHub Pages"
```

预期：产生一个包含工作流和计划文档的提交。

- [ ] **步骤 2：推送到 master**

运行：

```bash
git push origin master
```

预期：远端 `master` 更新并触发部署工作流。

### 任务 4：配置 Pages 并验收线上站点

**文件：**
- 无本地文件变更。

- [ ] **步骤 1：启用 GitHub Actions 发布源**

打开：

```text
https://github.com/yukariyukaro/personal-blog/settings/pages
```

在 **Build and deployment** 中将 **Source** 设置为 **GitHub Actions**。若浏览器未登录，由用户完成登录后继续。

- [ ] **步骤 2：确认工作流成功**

打开：

```text
https://github.com/yukariyukaro/personal-blog/actions
```

预期：`部署 GitHub Pages` 工作流的 `build` 与 `deploy` 均成功。

- [ ] **步骤 3：验证自定义域名**

运行：

```bash
curl -I --retry 3 --retry-delay 5 https://blog.mmmiku.com/
```

预期：返回 HTTP 2xx 或 3xx。

- [ ] **步骤 4：验证关键静态资源**

从线上 HTML 提取一个 `/assets/` 资源地址并请求：

```bash
curl -fsSL https://blog.mmmiku.com/ |
  rg -o '(/assets/[^"]+)' |
  head -n 1
```

预期：得到资源路径；对完整 URL 执行 `curl -I` 后返回 HTTP 2xx。
