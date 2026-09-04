# 内容模型与 Markdown/MDX 渲染管线实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**目标：** 建立一次解析、构建期校验、默认安全的内容管线，并为文章页提供完整的 Markdown、受控 MDX、代码、公式、图表、Wiki Link、图片网格与灯箱能力。

**架构：** `scripts/content` 负责发现、校验、规范化和编译，输出 `ArticleIndex` 与 `ArticleDocument`；`src/domain` 定义浏览器侧领域契约，Service 只请求并校验版本，ViewModel 只管理选择和阅读状态，View 只渲染已清洗 HTML并挂载交互增强。Markdown、搜索文本、目录和后续 Feed 全部来自同一次 Unified AST 处理，禁止客户端正则二次解析正文。

**技术栈：** Node.js、gray-matter、Unified、remark/rehype、Shiki、KaTeX、Mermaid、React 19、TypeScript、Vitest、Playwright。

---

## 文件结构

```text
apps/web/
├── scripts/
│   ├── build-content.mjs
│   └── content/
│       ├── article-schema.mjs
│       ├── assets.mjs
│       ├── build-content.mjs
│       ├── build-content.test.mjs
│       ├── discover-posts.mjs
│       ├── markdown-compiler.mjs
│       ├── markdown-compiler.test.mjs
│       ├── plantuml.mjs
│       └── plugins/
│           ├── remark-controlled-mdx.mjs
│           ├── remark-content-links.mjs
│           ├── remark-directives.mjs
│           └── rehype-content-components.mjs
├── src/
│   ├── domain/content/
│   │   ├── article.ts
│   │   └── index.ts
│   ├── services/content/
│   │   └── contentRepository.ts
│   └── features/markdown/
│       ├── MarkdownContent.tsx
│       ├── MarkdownContent.css
│       ├── MarkdownCode.css
│       ├── MarkdownMedia.css
│       ├── MarkdownSyntax.css
│       ├── ImageLightbox.tsx
│       ├── useCodeInteractions.ts
│       ├── useDiagramInteractions.ts
│       └── useImageLightbox.ts
└── e2e/
    └── markdown-content.spec.ts
```

## Task 1：拆分内容构建并建立 Frontmatter Schema

**文件：**
- 创建：`apps/web/scripts/content/article-schema.mjs`
- 创建：`apps/web/scripts/content/discover-posts.mjs`
- 创建：`apps/web/scripts/content/build-content.mjs`
- 创建：`apps/web/scripts/content/build-content.test.mjs`
- 修改：`apps/web/scripts/build-content.mjs`
- 修改：`apps/web/package.json`

- [x] **Step 1：编写 Schema 与草稿模式失败测试**

使用临时目录创建公开文章、草稿、目录式 `index.mdx`、非法日期和重复 slug，断言：

```js
const production = await buildContent({
  postsRoot,
  outputRoot,
  includeDrafts: false,
})
assert.deepEqual(production.articles.map(({ slug }) => slug), [
  'directory-post',
  'public-post',
])

const development = await buildContent({
  postsRoot,
  outputRoot,
  includeDrafts: true,
})
assert.equal(development.articles.some(({ draft }) => draft === true), true)
await assert.rejects(() => buildInvalidDate(), /publishedAt.*YYYY-MM-DD/)
await assert.rejects(() => buildDuplicateSlug(), /Duplicate article slug/)
```

- [x] **Step 2：运行测试并确认失败**

运行：

```bash
node --test scripts/content/build-content.test.mjs
```

预期：因内容模块尚不存在而失败。

- [x] **Step 3：实现可选字段的严格读取**

`article-schema.mjs` 输出 `parseArticleFrontmatter(data, sourcePath)`。必填字段保持
`title/slug/summary/publishedAt/category/tags`；新增字段均为可选，缺失时不写入
对象：

```js
{
  updatedAt?: string,
  draft?: boolean,
  pinned?: boolean,
  priority?: number,
  language?: string,
  comments?: boolean,
  author?: { name: string, url?: string },
  source?: { title?: string, url: string },
  license?: { name: string, url?: string },
  aliases?: string[],
  permalink?: string
}
```

日期必须是 `YYYY-MM-DD`，slug 必须匹配
`/^[a-z0-9]+(?:-[a-z0-9]+)*$/`，priority 必须是有限整数。作者、来源和许可证
URL 只允许 `http:` 或 `https:`；permalink 只允许无查询串和片段的站内绝对路径。
不为缺失字段补默认业务值。

- [x] **Step 4：实现文章发现和构建模式**

`discover-posts.mjs` 递归发现 `.md/.mdx`，忽略 `README.md`，同时支持
`posts/name.md` 与 `posts/name/index.md`。`build-content.mjs` 导出：

```js
export async function buildContent({
  postsRoot,
  outputRoot,
  includeDrafts = false,
}) {}
```

草稿必须在排序、分类、标签和统计前过滤。排序依次使用 `pinned`、`priority`、
`publishedAt`、`slug`；未提供的可选字段不写入索引。

- [x] **Step 5：收口 CLI 与开发模式**

根入口只解析 `--include-drafts` 并调用模块：

```js
await buildContent({
  postsRoot,
  outputRoot,
  includeDrafts: process.argv.includes('--include-drafts'),
})
```

`package.json` 使用：

```json
{
  "content:build": "node scripts/build-content.mjs",
  "content:build:dev": "node scripts/build-content.mjs --include-drafts",
  "dev": "pnpm run content:build:dev && vite"
}
```

- [x] **Step 6：运行测试并提交**

```bash
node --test scripts/content/build-content.test.mjs
pnpm run check:size
git add apps/web/scripts apps/web/package.json apps/web/pnpm-lock.yaml
git commit -m "refactor: 建立内容模型与构建分层"
```

## Task 2：建立安全的 Markdown 与受控 MDX 编译器

**文件：**
- 创建：`apps/web/scripts/content/markdown-compiler.mjs`
- 创建：`apps/web/scripts/content/markdown-compiler.test.mjs`
- 创建：`apps/web/scripts/content/plugins/remark-controlled-mdx.mjs`
- 修改：`apps/web/package.json`

- [ ] **Step 1：安装构建期依赖**

```bash
pnpm add -D github-slugger hast-util-to-text katex rehype-autolink-headings rehype-katex rehype-pretty-code rehype-sanitize rehype-slug rehype-stringify remark-directive remark-math remark-mdx remark-parse remark-rehype shiki unified unist-util-visit
```

- [ ] **Step 2：编写编译与安全失败测试**

覆盖 GFM 表格、任务列表、重复标题 slug、KaTeX、原始 HTML、危险 URL 和受控
MDX：

```js
const result = await compileMarkdown({
  source: '# 标题\n## 重复\n## 重复\n<script>alert(1)</script>',
  format: 'md',
  article: fixtureArticle,
  registry: fixtureRegistry,
})
assert.deepEqual(result.headings.map(({ id }) => id), ['重复', '重复-1'])
assert.equal(result.html.includes('<script'), false)

await assert.rejects(
  () => compileMarkdown({
    source: 'export const secret = 1',
    format: 'mdx',
    article: fixtureArticle,
    registry: fixtureRegistry,
  }),
  /MDX imports, exports, and expressions are not allowed/,
)
```

- [ ] **Step 3：实现单次 AST 编译**

`compileMarkdown` 返回：

```js
{
  html: string,
  headings: Array<{ id: string, level: 2 | 3, text: string }>,
  searchText: string,
  wordCount: number,
  readingMinutes: number,
  assets: Array<{ sourcePath: string, outputPath: string, contentPath: string }>
}
```

插件顺序固定为：parse → 可选 MDX → GFM → math → directive → 受控语法转换 →
站内链接/资源解析 → remark-rehype → sanitize → slug/标题收集 → KaTeX →
Shiki → 内容组件 → stringify。原始 HTML不启用 `rehype-raw`。

- [ ] **Step 4：实现受控 MDX 白名单**

只允许：

```mdx
<Callout type="tip" title="提示">正文</Callout>
<Spoiler summary="展开">正文</Spoiler>
<ImageGrid columns="3">![图片](./image.png)</ImageGrid>
<GithubCard repo="owner/repository" />
```

拒绝 import/export、JS 表达式、spread 属性、非字符串属性和其他 JSX 标签。允许节点
转换为与 directive 相同的 mdast 结构，不执行作者代码。

- [ ] **Step 5：定义白名单清洗策略**

在 `remark-rehype` 后先使用 `rehype-sanitize`。仅允许 Markdown 标准元素及
`details/summary/figure/figcaption/picture/source`，仅允许经过校验的
`className/id/href/src/title/alt/loading/decoding/data-*` 属性；链接协议只允许
`http/https/mailto`，图片协议只允许 `http/https` 和站内相对路径。

- [ ] **Step 6：验证并提交**

```bash
node --test scripts/content/markdown-compiler.test.mjs
pnpm run check:size
git add apps/web/scripts/content apps/web/package.json apps/web/pnpm-lock.yaml
git commit -m "feat: 增加安全内容编译管线"
```

## Task 3：实现资源、Wiki Link 与内容扩展语法

**文件：**
- 创建：`apps/web/scripts/content/assets.mjs`
- 创建：`apps/web/scripts/content/plantuml.mjs`
- 创建：`apps/web/scripts/content/plugins/remark-content-links.mjs`
- 创建：`apps/web/scripts/content/plugins/remark-directives.mjs`
- 创建：`apps/web/scripts/content/plugins/rehype-content-components.mjs`
- 修改：`apps/web/scripts/content/markdown-compiler.mjs`
- 修改：`apps/web/scripts/content/markdown-compiler.test.mjs`
- 修改：`apps/web/package.json`

- [ ] **Step 1：安装 PlantUML 编码依赖并补失败测试**

```bash
pnpm add -D pako
```

测试覆盖：

- `![图](./assets/a.png)` 和 `[附件](./assets/a.pdf)` 被复制并改写。
- `../` 越界和缺失资源导致构建失败。
- `[[target]]`、`[[target#heading|标题]]` 解析为站内链接。
- 歧义 Wiki Link 和不存在的目标导致构建失败。
- `:::note`、`:spoiler[]`、`:::grid`、`::github` 生成语义化 HTML。
- Mermaid 保留源码占位，PlantUML 生成亮暗双 URL。

- [ ] **Step 2：用 AST 处理本地资源**

`assets.mjs` 只处理 mdast `image` 和非 Markdown 的相对 `link`，输出路径统一为：

```text
content/assets/<slug>/<article-relative-path>
```

资源路径必须留在文章资产根中；目录式文章资产根为 `index.md(x)` 所在目录。
重复输出路径内容不一致时构建失败。

- [ ] **Step 3：实现 Wiki Link**

解析顺序为 slug → 去除 `index` 的完整内容路径 → 唯一文件名。行内链接输出目标文章
URL 占位 `data-article-slug`，阶段 2 再统一改为永久路由；当前点击仍由
BlogReader ViewModel 打开文章。标题片段使用与标题收集相同的 slugger。

- [ ] **Step 4：实现扩展组件**

支持以下稳定语法：

```md
:::note[标题]
正文
:::

:spoiler[隐藏内容]

:::grid{columns="3" aspect="16/10" fit="cover"}
![一](./one.jpg "说明")
![二](./two.jpg "说明")
:::

::github{repo="owner/repository"}
```

`columns` 限制 1–6，`aspect` 限制正数比例，`fit` 只允许 `cover/contain`，
GitHub repo 必须匹配 `owner/name`。非法配置直接构建失败，不注入默认文案。

- [ ] **Step 5：实现代码、Mermaid 与 PlantUML 结构**

普通代码块由 Shiki 生成双主题 token；超过 20 行标记为可折叠。`code-group`
directive 将多个带标题代码块组织为 ARIA tablist。Mermaid 使用严格模式的运行时
占位；PlantUML 使用 `pako.deflateRaw` 生成配置服务器的 SVG URL，不在构建期发起
网络请求。

- [ ] **Step 6：验证并提交**

```bash
node --test scripts/content/markdown-compiler.test.mjs
pnpm run content:build
pnpm run check:size
git add apps/web/scripts/content apps/web/package.json apps/web/pnpm-lock.yaml
git commit -m "feat: 支持 Markdown 扩展语法"
```

## Task 4：输出统一 ArticleDocument 并接入前端领域层

**文件：**
- 创建：`apps/web/src/domain/content/article.ts`
- 创建：`apps/web/src/domain/content/index.ts`
- 创建：`apps/web/src/services/content/contentRepository.ts`
- 修改：`apps/web/scripts/content/build-content.mjs`
- 修改：`apps/web/src/utils/contentApi.ts`
- 修改：`apps/web/src/components/BlogReader/hooks/useArticleLibrary.ts`
- 修改：`apps/web/src/components/BlogReader/hooks/useArticleReading.ts`
- 修改：`apps/web/src/components/BlogReader/contentUtils.ts`
- 修改：`apps/web/src/components/BlogReader/types.ts`

- [ ] **Step 1：升级生成契约**

`index.json` 升级为 `schemaVersion: 2`，正文写入
`content/articles/<slug>.json`：

```ts
export type ArticleDocument = {
  schemaVersion: 1
  slug: string
  html: string
  headings: ArticleHeading[]
}
```

`ArticleSummary` 新增可选 Frontmatter 字段及构建期 `searchText`，`contentPath`
指向 JSON。搜索、正文和未来 Feed 均使用编译器返回值，不再解析原始 Markdown。

- [ ] **Step 2：建立 Repository**

`contentRepository.ts` 提供 `fetchArticleIndex` 与 `fetchArticleDocument`，校验
`schemaVersion`、HTTP 状态和目标 slug；请求失败时移除 Promise 缓存。旧
`utils/contentApi.ts` 改为兼容导出后删除业务实现。

- [ ] **Step 3：改造 ViewModel**

`useArticleLibrary` 缓存 `ArticleDocument`；`useArticleReading` 接收
`ArticleHeading[]`，只负责 IntersectionObserver。删除
`extractHeadings/getHeadingText`，避免 Markdown 被客户端二次解析。

- [ ] **Step 4：补领域契约测试**

使用 Vitest 验证：

- `schemaVersion` 不匹配时拒绝数据。
- 非法正文 slug 不进入缓存。
- 缺失可选 Frontmatter 时字段保持不存在。
- 搜索使用构建期 `searchText`。

- [ ] **Step 5：验证并提交**

```bash
pnpm run test:unit
pnpm run check:size
pnpm run build
git add apps/web/scripts/content apps/web/src/domain apps/web/src/services apps/web/src/components/BlogReader apps/web/src/utils
git commit -m "refactor: 接入统一文章文档契约"
```

## Task 5：实现正文交互增强

**文件：**
- 创建：`apps/web/src/features/markdown/MarkdownContent.tsx`
- 创建：`apps/web/src/features/markdown/ImageLightbox.tsx`
- 创建：`apps/web/src/features/markdown/useCodeInteractions.ts`
- 创建：`apps/web/src/features/markdown/useDiagramInteractions.ts`
- 创建：`apps/web/src/features/markdown/useImageLightbox.ts`
- 修改：`apps/web/src/components/BlogReader/ArticleDocument.tsx`
- 修改：`apps/web/package.json`

- [ ] **Step 1：安装运行时依赖**

```bash
pnpm add lucide-react mermaid
```

- [ ] **Step 2：替换 ReactMarkdown**

`MarkdownContent` 仅接收构建期 `ArticleDocument.html`，使用
`dangerouslySetInnerHTML` 渲染白名单 HTML，并通过 `ref` 把容器交给三个交互
Hook。删除 `react-markdown` 与客户端 remark 插件依赖。

- [ ] **Step 3：实现代码交互**

使用事件委托实现复制、折叠和代码组：

- 复制读取当前代码块 `code.textContent`，成功状态 2 秒后清理。
- 折叠按钮同步 `aria-expanded`。
- tab 支持点击、左右键、Home、End；隐藏 panel 不进入 Tab 顺序。
- 打印和 reduced-motion 模式下代码始终展开。

按钮图标使用 `lucide-react` 对应图标；构建产物仅保留挂载点和 ARIA 标签。

- [ ] **Step 4：实现图表交互**

只有正文含 Mermaid 占位时才 `import('mermaid')`。使用：

```ts
mermaid.initialize({
  startOnLoad: false,
  securityLevel: 'strict',
  theme: resolvedTheme === 'light' ? 'default' : 'dark',
})
```

主题变化时重新渲染。PlantUML 只切换已生成的亮暗 URL；渲染失败时保留源码和明确
错误状态，不伪造图表。

- [ ] **Step 5：实现图片灯箱**

普通正文图片和网格图片点击后打开原图 Dialog，支持 Escape、上一张、下一张、
缩放和关闭；打开时锁定背景滚动，关闭后焦点回到触发图片。按钮使用 Lucide 图标和
tooltip。

- [ ] **Step 6：验证并提交**

```bash
pnpm run lint
pnpm run test:unit
pnpm run build
git add apps/web/src/features/markdown apps/web/src/components/BlogReader apps/web/package.json apps/web/pnpm-lock.yaml
git commit -m "feat: 增加文章交互增强"
```

## Task 6：完成 Mizuki 风格排版与响应式样式

**文件：**
- 创建：`apps/web/src/features/markdown/MarkdownContent.css`
- 创建：`apps/web/src/features/markdown/MarkdownCode.css`
- 创建：`apps/web/src/features/markdown/MarkdownMedia.css`
- 创建：`apps/web/src/features/markdown/MarkdownSyntax.css`
- 修改：`apps/web/src/components/BlogReader/BlogReaderArticle.css`
- 修改：`apps/web/src/components/BlogReader/BlogReaderTheme.css`

- [ ] **Step 1：建立正文视觉 token**

沿用初音绿主色，补充提示块五色、代码表面、图表表面、灯箱遮罩和表格边界 token。
浅色模式保持白底深字，深色模式保持半透明深色；卡片圆角不超过 8px。

- [ ] **Step 2：实现阅读 rail**

正文文本限制在舒适阅读宽度，表格、代码组、块公式、图表和图片网格可使用正文列全宽。
所有宽内容设置 `min-width: 0` 和局部横向滚动，不允许页面级横向溢出。

- [ ] **Step 3：实现扩展语法样式**

覆盖 Callout、Spoiler、GitHub 卡片、Wiki Link、表格、任务列表、KaTeX、代码工具栏、
代码组、Mermaid、PlantUML、图片网格和灯箱。交互按钮使用稳定尺寸，hover/focus
不得引发布局位移。

- [ ] **Step 4：实现响应式矩阵**

- `>=1440px`：正文与 TOC 双列，宽内容完整展开。
- `1024–1439px`：正文与窄 TOC，图表控制保持桌面尺寸。
- `768–1023px`：TOC 移到正文上方，图片网格最多两列。
- `<768px`：单列，代码语言标签隐藏，按钮 36px，表格/公式局部滚动。
- `<480px`：图片网格单列，灯箱工具栏按钮 32px。

- [ ] **Step 5：验证行数并提交**

```bash
pnpm run check:size
pnpm run lint
git add apps/web/src/features/markdown apps/web/src/components/BlogReader
git commit -m "style: 完善文章排版与响应式体验"
```

## Task 7：增加内容夹具、E2E 与作者文档

**文件：**
- 创建：`blog-content/posts/content-showcase/index.mdx`
- 创建：`blog-content/posts/content-showcase/diagram.png`
- 修改：`blog-content/posts/README.md`
- 创建：`apps/web/e2e/markdown-content.spec.ts`
- 修改：`apps/web/e2e/blog-responsive.spec.ts`

- [ ] **Step 1：新增公开能力展示文章**

Frontmatter 使用全部可选字段中的安全示例，正文覆盖 GFM、Callout、代码组、KaTeX、
Mermaid、PlantUML、Wiki Link、GitHub 卡片、Spoiler、本地图片网格和灯箱。图片必须
使用真实本地资源，不添加占位图。

- [ ] **Step 2：更新内容作者契约**

README 记录所有 Frontmatter 字段、目录式文章、本地资源路径、受控 MDX 白名单和
扩展语法。明确生产构建排除草稿、原始 HTML 不执行、PlantUML 源码会编码进外部服务
URL。

- [ ] **Step 3：增加浏览器验收**

E2E 覆盖：

- 目录与构建期 heading id 一致。
- Callout、KaTeX、代码高亮、复制、折叠和代码组可操作。
- Mermaid 渲染或显示明确失败状态。
- Wiki Link 可切换文章且不破坏 Hash Router。
- 图片灯箱支持键盘关闭和焦点恢复。
- 桌面、平板、移动端没有横向溢出。

- [ ] **Step 4：运行阶段总门禁**

```bash
pnpm run check
pnpm run test:e2e
```

预期：全部静态检查、单测、构建和三端 E2E 通过；移动端 Live2D 保持既有单项跳过。

- [ ] **Step 5：提交**

```bash
git add blog-content/posts apps/web/e2e
git commit -m "test: 固化增强内容阅读体验"
```

## 自审结果

- 规格覆盖：完整 Frontmatter、目录式内容、受控 MDX、GFM、提示块、代码、公式、
  Mermaid、PlantUML、Wiki Link、GitHub 卡片、Spoiler、图片网格、灯箱、安全清洗、
  搜索复用、响应式和 500 行门禁均有对应任务。
- 安全边界：MDX 不执行代码，原始 HTML 不进入输出，URL 和属性经过白名单校验；
  Mermaid 使用 strict 模式；PlantUML 的外部传输行为在作者文档中明确。
- 类型一致性：浏览器只消费 `ArticleIndex schemaVersion: 2` 和
  `ArticleDocument schemaVersion: 1`，目录由文档产物提供。
- 默认值规则：缺失可选业务字段保持缺失并由 View 隐藏；仅对安全阈值、布局列数和
  构建模式使用技术默认值。
- 文件规模：每个脚本、组件、Hook 和样式文件职责单一，并持续受 500 行门禁约束。
