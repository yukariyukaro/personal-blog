# 博客 Playwright E2E 验收实施计划

> **供智能体执行：** 必须使用 `superpowers:subagent-driven-development`（推荐）或 `superpowers:executing-plans`，按任务逐项实施并更新复选框。

**目标：** 为博客三条页面路由增加可重复执行的桌面端与手机端 E2E 和视觉回归测试，并生成包含验收截图的 Playwright HTML 报告。

**架构：** 使用 Playwright Test 的两个 Chromium 项目覆盖 1440x900 桌面视口和 390x844 手机视口。测试先断言页面内容、导航状态、全屏布局和横向溢出，再执行整页视觉快照比对，并将当次截图附加到 HTML 报告。

**技术栈：** Playwright Test、Chromium、TypeScript、Vite

---

### 任务 1：接入 Playwright Test

**文件：**
- 修改：`apps/web/package.json`
- 修改：`apps/web/pnpm-lock.yaml`
- 修改：`apps/web/.gitignore`
- 创建：`apps/web/playwright.config.ts`

- [x] **步骤 1：安装测试依赖**

运行：

```bash
pnpm add -D @playwright/test
pnpm exec playwright install chromium
```

工作目录：`apps/web`

预期：`@playwright/test` 写入 `devDependencies`，Chromium 可供测试运行器使用。

- [x] **步骤 2：增加测试脚本**

在 `apps/web/package.json` 中加入：

```json
"test:e2e": "playwright test",
"test:e2e:update": "playwright test --update-snapshots",
"test:e2e:report": "playwright show-report output/playwright/blog-acceptance-report"
```

- [x] **步骤 3：配置双端项目与 HTML 报告**

`apps/web/playwright.config.ts` 配置：

```ts
projects: [
  { name: 'desktop-chromium', use: { viewport: { width: 1440, height: 900 } } },
  {
    name: 'mobile-chromium',
    use: {
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    },
  },
],
reporter: [
  ['list'],
  ['html', {
    outputFolder: 'output/playwright/blog-acceptance-report',
    open: 'never',
  }],
],
```

测试默认启动 `127.0.0.1:4173` 的 Vite 服务，并使用 `prefers-reduced-motion` 固定动画和首页静态背景。

- [x] **步骤 4：忽略运行产物**

在 `apps/web/.gitignore` 中加入：

```gitignore
output/playwright
```

视觉基线位于 `apps/web/e2e/__screenshots__/`，不加入忽略规则。

### 任务 2：编写页面与响应式验收用例

**文件：**
- 创建：`apps/web/e2e/blog-pages.spec.ts`

- [x] **步骤 1：定义三页验收契约**

用例覆盖：

```ts
[
  { path: '/#/Home', indicator: '01', content: '娄宿三的小站' },
  { path: '/#/Information', indicator: '02', content: 'ID ORIGIN' },
  { path: '/#/Portfolio', indicator: '03', content: 'PROJECT FILE' },
]
```

每页断言当前导航高亮、关键内容可见、当前 Panel 覆盖视口且无横向溢出。

- [x] **步骤 2：验证响应式导航**

桌面项目断言 Navbar 可见，并通过点击依次进入 Information 和 Portfolio；手机项目断言 Navbar 按既有 CSS 隐藏，各页面仍能通过路由直接访问。

- [x] **步骤 3：生成视觉基线与报告截图**

每个页面在两个项目中执行：

```ts
await expect(page).toHaveScreenshot(`${pageConfig.slug}.png`, {
  fullPage: true,
})

await testInfo.attach(`${deviceLabel}-${pageConfig.name}验收截图`, {
  body: await page.screenshot({ fullPage: true }),
  contentType: 'image/png',
})
```

预期：共生成六份视觉基线，HTML 报告的六条页面用例均包含当次桌面或手机截图。

### 任务 3：执行与验收

**文件：**
- 生成：`apps/web/e2e/__screenshots__/**`
- 生成：`apps/web/output/playwright/blog-acceptance-report/index.html`

- [x] **步骤 1：首次生成视觉基线**

运行：

```bash
pnpm run test:e2e:update
```

工作目录：`apps/web`

预期：页面断言通过并写入六份基线。

- [x] **步骤 2：执行不更新基线的回归测试**

运行：

```bash
pnpm run test:e2e
```

工作目录：`apps/web`

预期：全部测试通过，证明当前渲染与刚确认的验收基线一致。

- [x] **步骤 3：检查报告附件**

确认 `apps/web/output/playwright/blog-acceptance-report/index.html` 存在，并检查报告资源中同时包含 `desktop` 与 `mobile` 六张验收截图。

- [x] **步骤 4：执行项目校验**

运行：

```bash
pnpm run lint
pnpm run build
git diff --check
```

预期：Lint、TypeScript、Vite 构建及空白检查均通过。
