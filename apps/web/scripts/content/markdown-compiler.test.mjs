import assert from 'node:assert/strict'
import test from 'node:test'
import { compileMarkdown } from './markdown-compiler.mjs'

const fixtureArticle = {
  slug: 'safe-markdown',
  title: '安全 Markdown',
}

const fixtureRegistry = new Map()

const compile = (source, format = 'md') =>
  compileMarkdown({
    source,
    format,
    article: fixtureArticle,
    registry: fixtureRegistry,
  })

test('编译 GFM 表格与任务列表', async () => {
  const result = await compile(`
| 名称 | 状态 |
| --- | --- |
| 编译器 | 完成 |

- [x] 已完成
- [ ] 待处理
`)

  assert.match(result.html, /<table>/)
  assert.match(result.html, /<th>名称<\/th>/)
  assert.match(result.html, /class="contains-task-list"/)
  assert.match(result.html, /type="checkbox" checked disabled/)
  assert.match(result.html, /type="checkbox" disabled/)
})

test('仅收集 h2 与 h3 并按 github-slugger 规则稳定处理重复标题', async () => {
  const result = await compile(`
# 文档标题
## 重复标题
### 重复标题
## 重复标题
#### 不进入目录
`)

  assert.deepEqual(result.headings, [
    { id: '重复标题', level: 2, text: '重复标题' },
    { id: '重复标题-1', level: 3, text: '重复标题' },
    { id: '重复标题-2', level: 2, text: '重复标题' },
  ])
  assert.match(result.html, /<h2 id="重复标题">/)
  assert.match(result.html, /href="#重复标题"/)
})

test('图片标题使用 alt 且空标题不生成目录项', async () => {
  const result = await compile(`
## ![架构图](./architecture.png)
## ![](./empty.png)
`)

  assert.deepEqual(result.headings, [
    { id: '架构图', level: 2, text: '架构图' },
  ])
  assert.match(result.html, /<h2 id="架构图">/)
  assert.doesNotMatch(result.html, /<h2 id="">/)
})

test('渲染 KaTeX 公式并用 Shiki 高亮代码', async () => {
  const result = await compile(`
行内公式 $E=mc^2$。

$$
\\int_0^1 x^2 dx
$$

\`\`\`js
const answer = 42
\`\`\`
`)

  assert.match(result.html, /class="katex"/)
  assert.match(result.html, /class="katex-display"/)
  assert.match(result.html, /data-rehype-pretty-code-figure/)
  assert.match(result.html, /data-language="js"/)
})

test('从可见 AST 文本生成搜索与阅读统计并排除代码和原始 HTML', async () => {
  const result = await compile(`
## 标题

中文测试 English words

\`inline noise\`

\`\`\`js
const hidden = 'code noise'
\`\`\`

<div>HTML noise</div>
`)

  assert.equal(result.searchText, '标题 中文测试 English words')
  assert.equal(result.wordCount, 8)
  assert.equal(result.readingMinutes, 1)
  assert.deepEqual(result.assets, [])
  assert.doesNotMatch(result.html, /HTML noise/)
})

test('丢弃原始 HTML 与危险 URL 并保留允许的链接和图片地址', async () => {
  const result = await compile(`
<script>alert(1)</script>
<img src="x" onerror="alert(2)">

[脚本](javascript:alert(3))
[数据](data:text/html,boom)
[站内](/docs/start)
[相对](./guide)
[锚点](#section)
[邮件](mailto:hello@example.com)
[外链](https://example.com)

![危险图片](data:image/svg+xml,boom)
![站内图片](./image.png)
![外部图片](https://example.com/image.png)
`)

  assert.doesNotMatch(result.html, /<script|onerror|alert\(|javascript:|data:/i)
  assert.match(result.html, /href="\/docs\/start"/)
  assert.match(result.html, /href="\.\/guide"/)
  assert.match(result.html, /href="#section"/)
  assert.match(result.html, /href="mailto:hello@example.com"/)
  assert.match(result.html, /href="https:\/\/example.com"/)
  assert.match(result.html, /src="\.\/image.png"/)
  assert.match(result.html, /src="https:\/\/example.com\/image.png"/)
})

test('将受控 MDX 转换为安全且稳定的语义结构', async () => {
  const result = await compile(
    `
<Callout type="tip" title="提示">正文</Callout>

<Spoiler summary="展开">隐藏内容</Spoiler>

<ImageGrid columns="3">![图片](./image.png)</ImageGrid>

<GithubCard repo="owner/repository" />
`,
    'mdx',
  )

  assert.match(
    result.html,
    /<blockquote class="mdx-callout mdx-callout-tip" data-callout-type="tip">/,
  )
  assert.match(result.html, /<strong class="mdx-callout-title">提示<\/strong>/)
  assert.match(result.html, /<details class="mdx-spoiler">/)
  assert.match(result.html, /<summary>展开<\/summary>/)
  assert.match(
    result.html,
    /<figure class="mdx-image-grid" data-columns="3">/,
  )
  assert.match(result.html, /<img src="\.\/image.png" alt="图片">/)
  assert.match(
    result.html,
    /<figure class="mdx-github-card" data-repo="owner\/repository">/,
  )
  assert.match(
    result.html,
    /href="https:\/\/github.com\/owner\/repository"/,
  )
})

test('将基础 directive 转换为不透传任意属性的安全结构', async () => {
  const result = await compile(`
:::note{onclick="alert(1)"}
正文
:::
`)

  assert.equal(
    result.html,
    '<div class="directive" data-directive="note"><p>正文</p></div>',
  )
  assert.doesNotMatch(result.html, /onclick|alert/)
})

test('拒绝 MDX import、export、表达式、spread 与未知标签', async () => {
  const rejectedSources = [
    "import Widget from './widget.js'",
    'export const secret = 1',
    '{process.exit()}',
    '<Callout type={kind} title="提示">正文</Callout>',
    '<Callout {...props}>正文</Callout>',
    '<Unknown />',
    '<div>不允许的 JSX 标签</div>',
  ]

  for (const source of rejectedSources) {
    await assert.rejects(
      () => compile(source, 'mdx'),
      /MDX imports, exports, and expressions are not allowed|Unsupported MDX component/,
    )
  }
})

test('拒绝受控 MDX 的未知属性、缺失属性与非法组件内容', async () => {
  const rejectedSources = [
    '<Callout type="tip" title="提示" extra="x">正文</Callout>',
    '<Spoiler>正文</Spoiler>',
    '<ImageGrid columns="3">不是图片</ImageGrid>',
    '<GithubCard repo="invalid" />',
    '<GithubCard repo="owner/." />',
    '<GithubCard repo="owner/.." />',
    '<GithubCard repo="owner/repository." />',
    '<GithubCard repo="owner/repository//../../other/project" />',
    '<GithubCard repo="owner/repository">正文</GithubCard>',
  ]

  for (const source of rejectedSources) {
    await assert.rejects(() => compile(source, 'mdx'), /Invalid MDX component/)
  }
})

test('拒绝在行内容器中嵌套块级 MDX 组件', async () => {
  const rejectedSources = [
    '*<Spoiler summary="展开">隐藏内容</Spoiler>*',
    '[<Spoiler summary="展开">隐藏内容</Spoiler>](https://example.com)',
    '## <Spoiler summary="展开">隐藏内容</Spoiler>',
  ]

  for (const source of rejectedSources) {
    await assert.rejects(
      () => compile(source, 'mdx'),
      /block components must use flow syntax/,
    )
  }
})
