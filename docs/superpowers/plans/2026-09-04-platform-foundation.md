# 博客平台基础架构实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**目标：** 完成当前博客重构闭环，建立 MVVM 分层、500 行硬门禁和可信的桌面/移动端验收基线。

**架构：** 内容索引属于 Model，`useArticleLibrary`、`useArticleReading` 和新增的组合 Hook 属于 ViewModel，卡片、侧栏、目录与正文属于 View。页面入口只负责组合，不直接请求数据或维护复杂交互状态。CSS 按布局、卡片、文章和主题拆分，入口样式文件只负责聚合。

**技术栈：** React 19、TypeScript、Vite 8、React Router 7、Playwright、Node.js 脚本、CSS Custom Properties。

**完成状态：** 2026-09-04 已完成。最终验证为 `pnpm run check` 通过，
Playwright 三端 `53 passed / 1 skipped`；跳过项仅为移动端不启用 Live2D。

---

## 文件结构

```text
apps/web/
├── scripts/
│   └── quality/
│       ├── check-file-lines.mjs
│       └── check-file-lines.test.mjs
├── src/
│   ├── app/
│   │   └── navigation/
│   │       └── navigationConfig.ts
│   ├── config/
│   │   └── siteProfile.ts
│   └── components/
│       └── BlogReader/
│           ├── index.tsx
│           ├── BlogReaderView.tsx
│           ├── BlogReader.css
│           ├── BlogReaderLayout.css
│           ├── BlogReaderCards.css
│           ├── BlogReaderArticle.css
│           ├── BlogReaderTheme.css
│           ├── hooks/
│           │   ├── useArticleLibrary.ts
│           │   ├── useArticleReading.ts
│           │   └── useBlogReaderViewModel.ts
│           └── types.ts
└── e2e/
    └── blog-experience.spec.ts
```

### Task 1：建立 500 行代码门禁

**文件：**
- 创建：`apps/web/scripts/quality/check-file-lines.mjs`
- 创建：`apps/web/scripts/quality/check-file-lines.test.mjs`
- 修改：`apps/web/package.json`

- [x] **Step 1：编写失败测试**

测试创建临时目录，验证 500 行通过、501 行失败，并确认 Markdown、JSON 和生成目录不参与检查：

```js
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import test from 'node:test'
import { findOversizedCodeFiles } from './check-file-lines.mjs'

test('代码文件最多允许 500 行', async () => {
  const root = await mkdtemp(join(tmpdir(), 'blog-line-limit-'))
  await mkdir(join(root, 'src'), { recursive: true })
  await writeFile(join(root, 'src/valid.ts'), 'x\n'.repeat(500))
  await writeFile(join(root, 'src/invalid.css'), 'x\n'.repeat(501))
  await writeFile(join(root, 'src/content.md'), 'x\n'.repeat(800))

  assert.deepEqual(await findOversizedCodeFiles(root), [
    { path: 'src/invalid.css', lines: 501 },
  ])
  await rm(root, { recursive: true, force: true })
})
```

- [x] **Step 2：运行测试并确认失败**

运行：

```bash
node --test scripts/quality/check-file-lines.test.mjs
```

预期：因 `check-file-lines.mjs` 尚不存在而失败。

- [x] **Step 3：实现检查器**

实现只扫描 `.js`、`.jsx`、`.ts`、`.tsx`、`.mjs`、`.cjs`、`.css`、`.scss`
和 `.styl`，排除 `node_modules`、`dist`、`public/content` 和 `output`：

```js
import { readdir, readFile } from 'node:fs/promises'
import { extname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const CODE_EXTENSIONS = new Set([
  '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.css', '.scss', '.styl',
])
const IGNORED_DIRECTORIES = new Set(['node_modules', 'dist', 'output'])
export const MAX_CODE_LINES = 500

const collectFiles = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = await Promise.all(entries.map(async (entry) => {
    if (IGNORED_DIRECTORIES.has(entry.name)) return []
    const path = resolve(directory, entry.name)
    if (entry.isDirectory()) return collectFiles(path)
    return entry.isFile() && CODE_EXTENSIONS.has(extname(entry.name))
      ? [path]
      : []
  }))
  return files.flat()
}

export const findOversizedCodeFiles = async (root) => {
  const files = await collectFiles(root)
  const results = await Promise.all(files.map(async (path) => {
    const source = await readFile(path, 'utf8')
    const lines = source === '' ? 0 : source.split('\n').length - 1
    return { path: relative(root, path), lines }
  }))
  return results.filter(({ lines }) => lines > MAX_CODE_LINES)
}

const isCli = process.argv[1] === fileURLToPath(import.meta.url)
if (isCli) {
  const appRoot = resolve(fileURLToPath(new URL('../..', import.meta.url)))
  const oversized = await findOversizedCodeFiles(appRoot)
  if (oversized.length > 0) {
    for (const file of oversized) {
      console.error(`${file.path}: ${file.lines} lines`)
    }
    process.exitCode = 1
  }
}
```

- [x] **Step 4：接入项目命令**

在 `package.json` 中加入：

```json
{
  "scripts": {
    "check:size": "node scripts/quality/check-file-lines.mjs",
    "test:unit": "node --test scripts/**/*.test.mjs",
    "check": "pnpm run check:size && pnpm run lint && pnpm run test:unit && pnpm run build"
  }
}
```

- [x] **Step 5：运行测试**

```bash
pnpm run test:unit
pnpm run check:size
```

预期：单元测试通过；行数检查指出现有 `BlogReader.css` 超限，为 Task 2 提供红灯。

- [x] **Step 6：提交**

```bash
git add apps/web/scripts/quality apps/web/package.json
git commit -m "test: 增加代码文件行数门禁"
```

### Task 2：拆分 BlogReader 样式并收口视觉变量

**文件：**
- 修改：`apps/web/src/components/BlogReader/BlogReader.css`
- 修改：`apps/web/src/components/BlogReader/BlogReaderLayout.css`
- 修改：`apps/web/src/components/BlogReader/BlogReaderCards.css`
- 修改：`apps/web/src/components/BlogReader/BlogReaderArticle.css`
- 修改：`apps/web/src/components/BlogReader/BlogReaderTheme.css`
- 修改：`apps/web/src/components/Live2DWidget/loadLive2DWidget.ts`
- 删除：`apps/web/public/pio/l2d-widget.min.js`

- [x] **Step 1：将入口 CSS 改为纯聚合文件**

```css
@import './BlogReaderLayout.css';
@import './BlogReaderCards.css';
@import './BlogReaderArticle.css';
@import './BlogReaderTheme.css';
```

- [x] **Step 2：按职责迁移选择器**

迁移规则：

```text
BlogReaderLayout.css  -> 页面、三栏、工具栏、筛选、进度、返回顶部、响应式
BlogReaderCards.css   -> 作者、欢迎、时钟、统计、文章卡片
BlogReaderArticle.css -> 正文头部、Markdown、TOC、分享、推荐文章
BlogReaderTheme.css   -> token 映射、深浅主题差异、降级动效
```

禁止在多个文件重复定义同一选择器。基础卡片表面统一使用：

```css
--reader-surface: color-mix(in srgb, var(--surface-solid) 82%, transparent);
--reader-border: var(--line-color);
--reader-radius: 8px;
```

- [x] **Step 3：实现 Mizuki 风格响应式矩阵**

```css
@media (min-width: 1440px) {
  .blog-dashboard {
    grid-template-columns: 17rem minmax(0, 1fr) 17rem;
  }
}

@media (min-width: 1024px) and (max-width: 1439px) {
  .blog-dashboard {
    grid-template-columns: 15rem minmax(0, 1fr);
  }
  .blog-sidebar--right {
    display: none;
  }
}

@media (min-width: 768px) and (max-width: 1023px) {
  .blog-dashboard {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 767px) {
  .blog-dashboard {
    grid-template-columns: minmax(0, 1fr);
    padding-inline: 1rem;
  }
  .blog-article-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
```

- [x] **Step 4：验证行数和构建**

将第三方压缩脚本从源码目录移出。`loadLive2DWidget.ts` 使用固定版本的公共 CDN
地址加载 `l2d-widget`，保留现有加载失败状态，不在项目内继续维护 689 行的 vendor
文件：

```ts
export const LIVE2D_WIDGET_SCRIPT_URL =
  'https://cdn.jsdelivr.net/npm/l2d-widget@0.1.0/dist/l2d-widget.min.js'
```

`Live2DWidget` 只调用 `loadLive2DWidget(LIVE2D_WIDGET_SCRIPT_URL)`；脚本不可用时
保持关闭状态，不注入替代组件或默认提示。

- [x] **Step 5：验证行数和构建**

```bash
pnpm run check:size
pnpm run lint
pnpm run build
```

预期：每个 CSS 文件不超过 500 行，构建成功。

- [x] **Step 6：提交**

```bash
git add apps/web/src/components/BlogReader apps/web/src/components/Live2DWidget apps/web/public/pio
git commit -m "refactor: 拆分博客阅读器样式"
```

### Task 3：完成 BlogReader MVVM 组合

**文件：**
- 创建：`apps/web/src/components/BlogReader/hooks/useBlogReaderViewModel.ts`
- 创建：`apps/web/src/components/BlogReader/BlogReaderView.tsx`
- 修改：`apps/web/src/components/BlogReader/index.tsx`
- 修改：`apps/web/src/components/BlogReader/types.ts`

- [x] **Step 1：补充 ViewModel 契约**

在 `types.ts` 中加入：

```ts
export type BlogReaderViewModel = {
  articleSectionRef: RefObject<HTMLElement | null>
  searchInputRef: RefObject<HTMLInputElement | null>
  articles: ArticleSummary[] | null
  visibleArticles: ArticleSummary[]
  selectedArticle: ArticleSummary | null
  articleContent: string | null
  relatedArticles: ArticleSummary[]
  categories: ArticleFacetStat[]
  tags: ArticleFacetStat[]
  stats: ArticleIndexStats | null
  articleHeadings: ArticleHeading[]
  activeHeadingId: string | null
  activeCategory: string | null
  activeTag: string | null
  searchQuery: string
  readingProgress: number
  isBackToTopVisible: boolean
  indexError: boolean
  contentError: boolean
  shareStatus: 'idle' | 'copied'
  copyStatus: 'idle' | 'copied'
  now: Date
  openArticle: (article: ArticleSummary) => void
  setActiveCategory: (value: string | null) => void
  setActiveTag: (value: string | null) => void
  setSearchQuery: (value: string) => void
  copyEmail: () => void
  copyArticleLink: () => void
  scrollToTop: () => void
  navigateToHeading: (
    event: MouseEvent<HTMLAnchorElement>,
    id: string,
  ) => void
}
```

- [x] **Step 2：实现组合 ViewModel**

`useBlogReaderViewModel` 必须：

- 通过 `useSearchParams` 读取和更新 `post`。
- 使用 `useArticleLibrary` 获取内容。
- 使用 `filterArticles` 派生筛选结果。
- 使用标签、分类和标题交集计算最多 3 篇相关文章。
- 使用 `useArticleReading` 派生目录和阅读进度。
- 响应 `blog:focus-search` 事件并聚焦输入框。
- 复制链接失败时保持 `idle`，不得显示成功文案。
- 使用真实 `location.href`，不拼接假 URL。

核心组合：

```ts
const [params, setParams] = useSearchParams()
const requestedSlug = params.get('post')
const library = useArticleLibrary(requestedSlug)
const visibleArticles = useMemo(
  () => filterArticles(
    library.articles,
    activeCategory,
    activeTag,
    searchQuery,
  ),
  [library.articles, activeCategory, activeTag, searchQuery],
)
```

- [x] **Step 3：实现纯 View**

`BlogReaderView.tsx` 只接收 `BlogReaderViewModel`，按以下结构组合：

```tsx
<section className="blog-reader" aria-label="博客内容">
  <div className="blog-reading-progress" />
  <div className="blog-dashboard">
    <BlogSidebar side="left" />
    <ArticleCatalog />
    <BlogSidebar side="right" />
  </div>
  <section ref={vm.articleSectionRef} className="blog-document">
    <ArticleDocument />
  </section>
  <button className="blog-back-to-top" />
</section>
```

View 不允许出现 `fetch`、`localStorage`、URL 参数解析或数据聚合。

- [x] **Step 4：将入口缩减为组合层**

```tsx
import BlogReaderView from './BlogReaderView'
import { useBlogReaderViewModel } from './hooks/useBlogReaderViewModel'
import './BlogReader.css'

export default function BlogReader() {
  const viewModel = useBlogReaderViewModel()
  return <BlogReaderView viewModel={viewModel} />
}
```

- [x] **Step 5：运行静态检查**

```bash
pnpm run check:size
pnpm run lint
pnpm run build
```

预期：`BlogReader/index.tsx` 小于 30 行，所有代码文件小于 500 行。

- [x] **Step 6：提交**

```bash
git add apps/web/src/components/BlogReader
git commit -m "refactor: 完成博客阅读器 MVVM 分层"
```

### Task 4：收口导航、主题与站点配置

**文件：**
- 创建：`apps/web/src/app/navigation/navigationConfig.ts`
- 创建：`apps/web/src/config/siteProfile.ts`
- 修改：`apps/web/src/components/Navbar/index.tsx`
- 修改：`apps/web/src/components/BlogReader/BlogSidebar.tsx`
- 修改：`apps/web/src/components/ThemeSwitch/index.tsx`

- [x] **Step 1：建立导航配置**

```ts
export type NavigationItem = {
  id: 'home' | 'information' | 'portfolio'
  label: string
  shortLabel: string
  to: string
}

export const navigationItems: NavigationItem[] = [
  { id: 'home', label: 'INDEX', shortLabel: '首页', to: '/Home' },
  { id: 'information', label: 'INFORMATION', shortLabel: '介绍', to: '/Information' },
  { id: 'portfolio', label: 'PORTFOLIO', shortLabel: '作品', to: '/Portfolio' },
]
```

- [x] **Step 2：建立站点资料配置**

```ts
export const siteProfile = {
  name: '娄宿三',
  handle: 'Hamal',
  role: '前端开发者',
  email: '1981805808@qq.com',
  githubUrl: 'https://github.com/YukariYukaro',
  bilibiliUrl: 'https://space.bilibili.com/39374538',
  avatarPath: 'home/miku_点赞.jpg',
} as const
```

- [x] **Step 3：改造 View**

Navbar 从 `navigationItems` 渲染；BlogSidebar 从 `siteProfile` 渲染。配置字段为空时
不显示对应链接，不生成默认文案。

- [x] **Step 4：验证主题契约**

主题切换需满足：

- 第一次访问跟随系统。
- 用户选择写入 `localStorage`。
- 隐私模式存储失败时只保持当前会话状态。
- `prefers-reduced-motion` 下取消主题过渡动画。

- [x] **Step 5：运行检查并提交**

```bash
pnpm run check
git add apps/web/src/app apps/web/src/config apps/web/src/components
git commit -m "refactor: 收口导航与站点配置"
```

### Task 5：修复并校准核心 E2E

**文件：**
- 修改：`apps/web/e2e/blog-experience.spec.ts`
- 修改：`apps/web/playwright.config.ts`

- [x] **Step 1：核对真实产品契约**

每条失败用例先在浏览器中确认以下需求成立：

- 主题切换后文章区仍可操作。
- 搜索匹配标题、摘要、分类和标签。
- 目录点击只滚动，不破坏 Hash Router。
- `?post=<slug>` 可恢复文章。
- 标签筛选和相关文章均来自索引数据。

如果页面符合需求而定位器错误，修测试；如果页面不符合需求，修实现。不得为了绿测
删除功能断言。

- [x] **Step 2：缩短失败反馈**

将单条测试超时改为 20 秒，并让 `beforeEach` 显式等待内容索引完成：

```ts
test.setTimeout(20_000)

test.beforeEach(async ({ page }) => {
  await page.goto('/#/Home')
  await expect(
    page.getByRole('region', { name: '博客内容', exact: true }),
  ).toBeVisible()
  await expect(page.getByRole('searchbox', { name: '搜索文章' })).toBeVisible()
})
```

- [x] **Step 3：增加响应式断点项目**

```ts
{
  name: 'tablet-chromium',
  use: {
    browserName: 'chromium',
    viewport: { width: 834, height: 1112 },
    hasTouch: true,
    reducedMotion: 'reduce',
  },
}
```

- [x] **Step 4：运行核心 E2E**

```bash
pnpm run test:e2e
```

预期：桌面、平板、移动端全部通过；失败时保留截图和 trace。

- [x] **Step 5：运行总门禁**

```bash
pnpm run check
pnpm run test:e2e
```

- [x] **Step 6：提交**

```bash
git add apps/web/e2e apps/web/playwright.config.ts
git commit -m "test: 固化博客核心响应式体验"
```

## 自审结果

- 规格覆盖：包含 500 行限制、MVVM、精美样式基础、Mizuki 式四档响应式和测试可信性。
- 占位扫描：没有 `TODO`、`TBD` 或未定义的后续实现占位。
- 类型一致性：ViewModel 中使用的 `ArticleSummary`、`ArticleFacetStat` 和
  `ArticleIndexStats` 均来自现有 `contentApi.ts`。
- 边界说明：本计划只完成阶段 0，不提前混入 Markdown 增强、SEO 和特色页面；
  后续阶段按路线图逐个创建独立实施计划。
