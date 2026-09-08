# Mizuki 风格博客体验增强实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: 使用 `superpowers:executing-plans` 或 `superpowers:subagent-driven-development` 逐任务执行本计划。步骤使用复选框跟踪。

**目标：** 参考 Mizuki 的设计思想，在现有 React/Vite 博客中补齐主题切换、文章搜索、目录导航、阅读进度和响应式阅读体验，并降低文章内容加载与重复渲染成本。

**架构：** 保留当前 Git-backed Markdown → `public/content/index.json` 的内容链路，不迁移 Astro。将主题状态收口到 `ThemeSwitch`，将目录和阅读进度收口到文章阅读器，内容 API 使用模块级 Promise 缓存，UI 通过 CSS 变量同时支持深色和浅色模式。

**技术栈：** React 19、React Router、Vite、TypeScript、React Markdown、remark-gfm、原生 CSS、浏览器 IntersectionObserver/ResizeObserver。

---

### 任务 1：建立站点主题状态与基础设计变量

**文件：**
- 新建：`apps/web/src/components/ThemeSwitch/index.tsx`
- 新建：`apps/web/src/components/ThemeSwitch/ThemeSwitch.css`
- 修改：`apps/web/src/main.tsx`
- 修改：`apps/web/src/index.css`
- 修改：`apps/web/src/App.tsx`

- [ ] **步骤 1：新增主题切换组件**

组件使用 `localStorage` 保存 `blog-theme`，首次读取系统 `prefers-color-scheme`，切换时给 `document.documentElement` 设置 `data-theme`，并提供 `aria-label` 和 `title`。

- [ ] **步骤 2：把主题组件接入根布局**

在 `App.tsx` 的导航区域传入主题按钮，删除 `main.tsx` 中固定的 Radix 深色 appearance，让全局 CSS 变量成为颜色单一真相源。

- [ ] **步骤 3：补充 light/dark CSS 变量与焦点样式**

在 `index.css` 中定义页面背景、卡片、文字、边框、强调色和阴影变量，并保留当前深色首屏的视觉基调；浅色模式只覆盖变量，不复制组件规则。

- [ ] **步骤 4：运行类型检查**

运行 `pnpm exec tsc -b`，预期无 TypeScript 错误。

### 任务 2：改进顶栏导航与全局阅读辅助

**文件：**
- 修改：`apps/web/src/components/Navbar/index.tsx`
- 修改：`apps/web/src/components/Navbar/Navbar.css`
- 修改：`apps/web/src/components/ScrollIndicator/ScrollIndicator.css`

- [ ] **步骤 1：加入搜索入口、主题切换和移动端导航**

导航保留现有路径和高亮逻辑，新增搜索按钮、主题按钮和移动端菜单按钮；菜单打开时锁定页面滚动，点击导航或 Escape 后关闭。

- [ ] **步骤 2：保留滚动进度，但改为主题变量和更稳定的 RAF 更新**

进度条仍由导航组件维护，颜色、阴影和导航背景改用 CSS 变量，避免每次滚动触发无关布局变化。

- [ ] **步骤 3：优化移动端与 reduced-motion**

确保按钮触控尺寸不小于 44px，菜单不遮挡标题，所有装饰动画在 `prefers-reduced-motion: reduce` 下关闭。

### 任务 3：升级文章阅读器的搜索、目录和阅读进度

**文件：**
- 修改：`apps/web/src/components/BlogReader/index.tsx`
- 修改：`apps/web/src/components/BlogReader/BlogReader.css`

- [ ] **步骤 1：实现客户端文章搜索**

增加可清空的搜索框，按标题、摘要、分类、标签过滤文章；搜索关键词和分类共同生效，使用 `useMemo` 计算结果，避免输入时重复遍历和无意义渲染。

- [ ] **步骤 2：为 Markdown 标题生成稳定 ID 与目录**

从当前文章正文提取二级、三级标题，使用 `slugifyHeading` 生成去重 ID；React Markdown 的 `h2/h3` 渲染器复用同一 ID，目录点击使用平滑滚动，目录项使用 `aria-current` 表示当前标题。

- [ ] **步骤 3：使用 IntersectionObserver 更新当前目录项**

只观察正文标题，组件卸载或文章切换时断开 observer；没有标题时不渲染空目录面板。

- [ ] **步骤 4：加入文章阅读进度与返回顶部**

使用文章容器的 `scrollHeight/clientHeight` 计算阅读比例，滚动监听使用 passive + RAF；超过首屏后显示返回顶部按钮，点击后根据 reduced-motion 决定平滑或立即滚动。

- [ ] **步骤 5：移除后端缺失字段的前端自造文本**

删除统计区 `...`、分类区强制 `0` 等默认显示，只在后端字段存在时渲染对应值；错误提示仅保留真实请求失败信息。

- [ ] **步骤 6：优化图片与屏外文章渲染**

文章列表图片补充 `decoding="async"` 与稳定的 `aspect-ratio`；非当前文章内容和统计卡片使用 `content-visibility: auto`，避免首屏一次性布局全部长内容。

### 任务 4：降低内容请求与重复渲染成本

**文件：**
- 修改：`apps/web/src/utils/contentApi.ts`
- 修改：`apps/web/src/components/BlogReader/index.tsx`

- [ ] **步骤 1：为文章索引和正文增加模块级请求缓存**

索引请求缓存为 Promise，正文缓存以 `contentPath` 为 key；请求失败时删除对应缓存，允许刷新后重试，不把错误结果永久缓存。

- [ ] **步骤 2：拆出稳定的文章卡片与时钟展示**

把文章卡片和时钟拆成本文件内的 `memo` 组件，使时钟每 30 秒刷新不会重新创建全部文章卡片。

- [ ] **步骤 3：运行 lint 和构建**

运行 `pnpm run lint`、`pnpm run build`，预期无 lint/build 错误，并检查 `public/content/index.json` 仍由 Markdown 构建脚本生成。

### 任务 5：浏览器验收

**文件：**
- 修改：无
- 验证：`apps/web/playwright.config.ts`、现有 `tests/`

- [ ] **步骤 1：验证桌面端首页**

检查首屏导航、主题按钮、搜索展开、文章筛选、文章打开、目录高亮、阅读进度和返回顶部。

- [ ] **步骤 2：验证移动端首页**

检查移动端菜单、搜索框、卡片不溢出、目录面板不遮挡正文、按钮触控区域和图片不发生布局跳动。

- [ ] **步骤 3：记录最终验证命令与残余风险**

最终报告只声明实际执行通过的命令；若浏览器截图存在与现有快照的视觉差异，说明差异来自主题/布局升级而不是静默忽略。

### 任务 6：文章 permalink 与分享入口

**文件：**
- 修改：`apps/web/src/components/BlogReader/index.tsx`
- 修改：`apps/web/src/components/BlogReader/BlogReader.css`
- 修改：`apps/web/e2e/blog-experience.spec.ts`

- [ ] **步骤 1：同步文章查询参数**

使用 `#/Home?post=<slug>` 表示当前文章，URL 参数有效时优先恢复对应文章，无效参数回退文章索引首篇；首页无参数时保持站点级 SEO。

- [ ] **步骤 2：增加复制文章链接按钮**

在文章头部提供图标按钮，复制包含 `post` 参数的完整 URL，不修改当前页面的路由状态，并使用 `aria-live` 告知复制结果。

- [ ] **步骤 3：增加回归用例**

验证直接访问文章 URL 可以恢复文章标题和目录，并确认目录点击与分享入口在桌面、移动项目中可用。
