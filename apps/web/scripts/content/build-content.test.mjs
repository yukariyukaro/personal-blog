import assert from 'node:assert/strict'
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import test from 'node:test'
import { parseArticleFrontmatter } from './article-schema.mjs'
import { buildContent } from './build-content.mjs'
import { discoverPosts } from './discover-posts.mjs'

const createTestRoot = async (context) => {
  const root = await mkdtemp(join(tmpdir(), 'blog-content-build-'))
  context.after(() => rm(root, { recursive: true, force: true }))
  return root
}

const writeFixture = async (root, relativePath, content) => {
  const path = join(root, relativePath)
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, content)
  return path
}

const createArticle = ({
  title,
  slug,
  publishedAt = '2026-08-29',
  category = '工程',
  tags = ['Node.js'],
  extra = '',
  content = '这是一篇用于测试内容构建的文章。',
}) => `---
title: ${title}
slug: ${slug}
summary: ${title}摘要
publishedAt: '${publishedAt}'
category: ${category}
tags:
${tags.map((tag) => `  - ${tag}`).join('\n')}
${extra}---

${content}
`

const createFrontmatter = (overrides = {}) => ({
  title: 'Schema',
  slug: 'schema-post',
  summary: 'Schema 摘要',
  publishedAt: '2026-08-29',
  category: '工程',
  tags: ['Node.js'],
  ...overrides,
})

const readIndex = async (outputRoot) =>
  JSON.parse(await readFile(join(outputRoot, 'index.json'), 'utf8'))

test('递归发现文件式与目录式文章并忽略 README', async (context) => {
  const root = await createTestRoot(context)
  const postsRoot = join(root, 'posts')
  const articlePath = await writeFixture(postsRoot, 'article.md', '# article')
  const directoryArticlePath = await writeFixture(
    postsRoot,
    'nested/guide/index.mdx',
    '# guide',
  )
  await Promise.all([
    writeFixture(postsRoot, 'README.md', '# readme'),
    writeFixture(postsRoot, 'nested/README.md', '# nested readme'),
    writeFixture(postsRoot, 'nested/note.txt', 'note'),
  ])

  assert.deepEqual(await discoverPosts(postsRoot), [
    articlePath,
    directoryArticlePath,
  ])
})

test('production 排除草稿且 development 包含草稿', async (context) => {
  const root = await createTestRoot(context)
  const postsRoot = join(root, 'posts')
  const productionOutput = join(root, 'production')
  const developmentOutput = join(root, 'development')
  await Promise.all([
    writeFixture(
      postsRoot,
      'public.md',
      createArticle({
        title: '公开文章',
        slug: 'public-post',
        category: '公开分类',
        tags: ['公开标签'],
      }),
    ),
    writeFixture(
      postsRoot,
      'draft.md',
      createArticle({
        title: '草稿文章',
        slug: 'draft-post',
        category: '草稿分类',
        tags: ['草稿标签'],
        extra: 'draft: true\n',
      }),
    ),
  ])

  const production = await buildContent({
    postsRoot,
    outputRoot: productionOutput,
  })
  assert.deepEqual(production, await readIndex(productionOutput))
  assert.deepEqual(
    production.articles.map((article) => article.slug),
    ['public-post'],
  )
  assert.equal(production.stats.articleCount, 1)
  assert.deepEqual(production.categories, [{ name: '公开分类', count: 1 }])
  assert.deepEqual(production.tags, [{ name: '公开标签', count: 1 }])
  await assert.rejects(
    access(join(productionOutput, 'articles/draft-post.md')),
  )

  const development = await buildContent({
    postsRoot,
    outputRoot: developmentOutput,
    includeDrafts: true,
  })
  assert.deepEqual(development, await readIndex(developmentOutput))
  assert.deepEqual(
    development.articles.map((article) => article.slug),
    ['draft-post', 'public-post'],
  )
  assert.equal(development.stats.articleCount, 2)
  assert.equal(
    development.articles.find((article) => article.slug === 'draft-post')
      .draft,
    true,
  )
})

test('可选字段缺失时不写入文章对象', async (context) => {
  const root = await createTestRoot(context)
  const postsRoot = join(root, 'posts')
  const outputRoot = join(root, 'output')
  await writeFixture(
    postsRoot,
    'minimal.md',
    createArticle({ title: '最小文章', slug: 'minimal-post' }),
  )

  await buildContent({ postsRoot, outputRoot })
  const { articles } = await readIndex(outputRoot)
  const optionalFields = [
    'updatedAt',
    'draft',
    'pinned',
    'priority',
    'language',
    'comments',
    'author',
    'source',
    'license',
    'aliases',
    'permalink',
    'coverImage',
  ]

  assert.equal(articles.length, 1)
  for (const field of optionalFields) {
    assert.equal(Object.hasOwn(articles[0], field), false)
  }
})

test('Frontmatter Schema 保留合法可选字段并拒绝非法值', () => {
  const parsed = parseArticleFrontmatter(
    createFrontmatter({
      updatedAt: '2026-09-01',
      draft: false,
      pinned: true,
      priority: 0,
      language: 'zh-CN',
      comments: false,
      author: { name: '作者', url: 'https://example.com/author' },
      source: { title: '来源', url: 'http://example.com/source' },
      license: { name: 'CC BY', url: 'https://example.com/license' },
      aliases: ['old-schema-post'],
      permalink: '/articles/schema-post',
      coverImage: './cover.png',
    }),
    'schema.md',
  )

  assert.deepEqual(parsed, {
    title: 'Schema',
    slug: 'schema-post',
    summary: 'Schema 摘要',
    publishedAt: '2026-08-29',
    updatedAt: '2026-09-01',
    category: '工程',
    tags: ['Node.js'],
    draft: false,
    pinned: true,
    priority: 0,
    language: 'zh-CN',
    comments: false,
    author: { name: '作者', url: 'https://example.com/author' },
    source: { title: '来源', url: 'http://example.com/source' },
    license: { name: 'CC BY', url: 'https://example.com/license' },
    aliases: ['old-schema-post'],
    permalink: '/articles/schema-post/',
    coverImage: './cover.png',
  })
  assert.throws(
    () =>
      parseArticleFrontmatter(
        { ...parsed, priority: Number.POSITIVE_INFINITY },
        'schema.md',
      ),
    /priority.*finite integer/,
  )
})

test('coverImage 缺失、null 或空字符串时均不写入字段', () => {
  for (const coverImage of [undefined, null, '']) {
    const frontmatter =
      coverImage === undefined
        ? createFrontmatter()
        : createFrontmatter({ coverImage })
    const parsed = parseArticleFrontmatter(frontmatter, 'schema.md')

    assert.equal(Object.hasOwn(parsed, 'coverImage'), false)
  }
})

test('coverImage 之外的可选文本仍拒绝空值', () => {
  const invalidFrontmatters = [
    createFrontmatter({ updatedAt: '' }),
    createFrontmatter({ language: '' }),
    createFrontmatter({ author: { name: '作者', url: '' } }),
    createFrontmatter({
      source: { title: '', url: 'https://example.com/source' },
    }),
    createFrontmatter({ license: { name: 'CC BY', url: '' } }),
  ]

  for (const frontmatter of invalidFrontmatters) {
    assert.throws(
      () => parseArticleFrontmatter(frontmatter, 'schema.md'),
      /must be a non-empty string when provided/,
    )
  }
})

test('permalink 仅接受站内绝对路径并规范化首尾斜杠', () => {
  for (const [permalink, expected] of [
    ['/articles/schema-post', '/articles/schema-post/'],
    ['/articles/schema-post///', '/articles/schema-post/'],
    [
      '/%E4%B8%AD%E6%96%87/%E8%B7%AF%E5%BE%84',
      '/%E4%B8%AD%E6%96%87/%E8%B7%AF%E5%BE%84/',
    ],
  ]) {
    assert.equal(
      parseArticleFrontmatter(
        createFrontmatter({ permalink }),
        'schema.md',
      ).permalink,
      expected,
    )
  }

  for (const permalink of [
    '',
    '   ',
    '/',
    '///',
    'articles/schema-post',
    '/articles/../secret',
    '/a/%2e%2e/b',
    '/%252e%252e/x',
    '/%255c/x',
    '/%253A/x',
    '/%2500/x',
    '/%3F/x',
    '/%23/x',
    String.raw`/a\..\b`,
    '/a/./b',
    '/articles/%E4%B8%AD%E6%96%87/%ZZ',
    '/articles/%00/control',
    '/articles/schema-post?draft=true',
    '/articles/schema-post#section',
    '//example.com/schema-post',
    'https://example.com/schema-post',
    'custom:route',
    '/http://example.com/x',
    '/https://example.com/x',
    '/custom+scheme:/x',
    '/javascript:alert(1)',
    '/%6aavascript%3Aalert(1)',
    '/posts/a:b',
    '/a//b',
  ]) {
    assert.throws(
      () =>
        parseArticleFrontmatter(
          createFrontmatter({ permalink }),
          'schema.md',
        ),
      /permalink/,
    )
  }
})

test('author、source 和 license 的 url 仅接受 http/https', () => {
  for (const [frontmatter, errorPattern] of [
    [
      createFrontmatter({
        author: { name: '作者', url: 'ftp://example.com/author' },
      }),
      /author\.url.*http\/https/,
    ],
    [
      createFrontmatter({
        source: { url: 'ftp://example.com/source' },
      }),
      /source\.url.*http\/https/,
    ],
    [
      createFrontmatter({
        license: { name: 'CC BY', url: 'ftp://example.com/license' },
      }),
      /license\.url.*http\/https/,
    ],
  ]) {
    assert.throws(
      () => parseArticleFrontmatter(frontmatter, 'schema.md'),
      errorPattern,
    )
  }
})

test('非法日期会终止构建', async (context) => {
  const root = await createTestRoot(context)
  const postsRoot = join(root, 'posts')
  await writeFixture(
    postsRoot,
    'invalid-date.md',
    createArticle({
      title: '非法日期',
      slug: 'invalid-date',
      publishedAt: '2026-13-40',
    }),
  )

  await assert.rejects(
    buildContent({ postsRoot, outputRoot: join(root, 'output') }),
    /publishedAt.*YYYY-MM-DD/,
  )
})

test('重复 slug 会终止构建', async (context) => {
  const root = await createTestRoot(context)
  const postsRoot = join(root, 'posts')
  await Promise.all([
    writeFixture(
      postsRoot,
      'first.md',
      createArticle({ title: '第一篇', slug: 'duplicate-post' }),
    ),
    writeFixture(
      postsRoot,
      'second.md',
      createArticle({ title: '第二篇', slug: 'duplicate-post' }),
    ),
  ])

  await assert.rejects(
    buildContent({ postsRoot, outputRoot: join(root, 'output') }),
    /Duplicate article slug: duplicate-post/,
  )
})

test('按置顶、优先级、发布日期和 slug 排序', async (context) => {
  const root = await createTestRoot(context)
  const postsRoot = join(root, 'posts')
  const outputRoot = join(root, 'output')
  const articles = [
    { slug: 'normal-high', date: '2026-09-03', extra: 'priority: 100\n' },
    {
      slug: 'pinned-low',
      date: '2026-09-01',
      extra: 'pinned: true\npriority: 1\n',
    },
    { slug: 'normal-low', date: '2026-09-03', extra: 'priority: 1\n' },
    { slug: 'normal-none-b', date: '2026-09-02', extra: '' },
    { slug: 'normal-none-a', date: '2026-09-02', extra: '' },
  ]
  await Promise.all(
    articles.map(({ slug, date, extra }) =>
      writeFixture(
        postsRoot,
        `${slug}.md`,
        createArticle({
          title: slug,
          slug,
          publishedAt: date,
          extra,
        }),
      ),
    ),
  )

  await buildContent({ postsRoot, outputRoot })
  const index = await readIndex(outputRoot)
  assert.deepEqual(
    index.articles.map((article) => article.slug),
    [
      'pinned-low',
      'normal-high',
      'normal-low',
      'normal-none-a',
      'normal-none-b',
    ],
  )
})

test('保留正文、图片、字数、阅读时间和聚合输出能力', async (context) => {
  const root = await createTestRoot(context)
  const postsRoot = join(root, 'posts')
  const outputRoot = join(root, 'output')
  await Promise.all([
    writeFixture(postsRoot, 'guide/images/cover.png', 'cover'),
    writeFixture(postsRoot, 'guide/images/body.png', 'body'),
    writeFixture(
      postsRoot,
      'guide/index.mdx',
      createArticle({
        title: '目录文章',
        slug: 'directory-post',
        category: '指南',
        tags: ['Node.js', '构建'],
        extra: 'coverImage: ./images/cover.png\n',
        content: '正文内容\n\n![示例](./images/body.png?raw)',
      }),
    ),
  ])

  await buildContent({ postsRoot, outputRoot })
  const index = await readIndex(outputRoot)
  const [article] = index.articles
  assert.equal(article.coverImage, 'content/assets/directory-post/images/cover.png')
  assert.equal(article.wordCount > 0, true)
  assert.equal(article.readingMinutes, 1)
  assert.deepEqual(index.categories, [{ name: '指南', count: 1 }])
  assert.deepEqual(index.tags, [
    { name: '构建', count: 1 },
    { name: 'Node.js', count: 1 },
  ])
  assert.match(
    await readFile(join(outputRoot, 'articles/directory-post.md'), 'utf8'),
    /content\/assets\/directory-post\/images\/body\.png\?raw/,
  )
  assert.equal(
    await readFile(
      join(outputRoot, 'assets/directory-post/images/cover.png'),
      'utf8',
    ),
    'cover',
  )
  assert.equal(
    await readFile(
      join(outputRoot, 'assets/directory-post/images/body.png'),
      'utf8',
    ),
    'body',
  )
})
