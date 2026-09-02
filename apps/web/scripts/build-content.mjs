import { copyFile, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, extname, isAbsolute, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import matter from 'gray-matter'

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const repositoryRoot = resolve(appRoot, '../..')
const postsRoot = join(repositoryRoot, 'blog-content/posts')
const outputRoot = join(appRoot, 'public/content')
const articlesOutputRoot = join(outputRoot, 'articles')
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const datePattern = /^\d{4}-\d{2}-\d{2}$/
const markdownExtensions = new Set(['.md', '.mdx'])
const markdownImagePattern = /(!\[[^\]]*]\()([^)\s]+)([^)]*\))/g

const isExternalReference = (value) =>
  /^(?:https?:)?\/\//.test(value) ||
  value.startsWith('data:') ||
  value.startsWith('#')

const toPublicPath = (path) => path.replace(/\\/g, '/')

const collectMarkdownFiles = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = join(directory, entry.name)
      if (entry.isDirectory()) {
        return collectMarkdownFiles(entryPath)
      }
      if (
        entry.isFile() &&
        markdownExtensions.has(extname(entry.name).toLowerCase()) &&
        entry.name.toLowerCase() !== 'readme.md'
      ) {
        return [entryPath]
      }
      return []
    }),
  )

  return files.flat().sort()
}

const requireString = (data, field, sourcePath) => {
  const value = data[field]
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${sourcePath}: "${field}" must be a non-empty string`)
  }
  return value.trim()
}

const createPostAsset = (sourcePath, slug, assetPath, displayPath) => {
  const sourceDir = dirname(sourcePath)
  const absoluteSourcePath = resolve(sourceDir, assetPath)
  const relativeAssetPath = relative(sourceDir, absoluteSourcePath)

  if (relativeAssetPath.startsWith('..') || isAbsolute(relativeAssetPath)) {
    throw new Error(`${displayPath}: asset path must stay inside the article directory`)
  }

  const outputPath = join(outputRoot, 'assets', slug, relativeAssetPath)
  const contentPath = `content/assets/${slug}/${toPublicPath(relativeAssetPath)}`

  return {
    sourcePath: absoluteSourcePath,
    outputPath,
    contentPath,
  }
}

const resolveArticleImage = (value, sourcePath, slug, displayPath, assets) => {
  if (isExternalReference(value)) {
    return value
  }
  if (value.startsWith('/')) {
    return value.replace(/^\/+/, '')
  }

  const asset = createPostAsset(sourcePath, slug, value, displayPath)
  assets.push(asset)
  return asset.contentPath
}

const rewriteMarkdownAssetReferences = (content, sourcePath, slug, displayPath, assets) =>
  content.replace(markdownImagePattern, (match, prefix, assetPath, suffix) => {
    if (isExternalReference(assetPath) || assetPath.startsWith('/')) {
      return match
    }

    const [, pathname = assetPath, trailing = ''] =
      assetPath.match(/^([^?#]*)(.*)$/) ?? []
    const asset = createPostAsset(sourcePath, slug, pathname, displayPath)
    assets.push(asset)

    return `${prefix}${asset.contentPath}${trailing}${suffix}`
  })

const countContentWords = (content) => {
  const plainText = content
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
    .replace(/\[[^\]]*]\([^)]*\)/g, '$1')
    .replace(/[#>*_\-|~`[\](){}.,:;!?'"，。！？、：；（）《》“”‘’]/g, ' ')

  return (
    plainText.match(
      /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]|[A-Za-z0-9]+(?:[-_'][A-Za-z0-9]+)*/gu,
    )?.length ?? 0
  )
}

const parsePost = async (sourcePath) => {
  const source = await readFile(sourcePath, 'utf8')
  const { data, content } = matter(source)
  const displayPath = relative(repositoryRoot, sourcePath)
  const title = requireString(data, 'title', displayPath)
  const slug = requireString(data, 'slug', displayPath)
  const summary = requireString(data, 'summary', displayPath)
  const publishedAt = requireString(data, 'publishedAt', displayPath)
  const category = requireString(data, 'category', displayPath)
  const coverImage = requireString(data, 'coverImage', displayPath)
  const assets = []

  if (!slugPattern.test(slug)) {
    throw new Error(`${displayPath}: "slug" must use lowercase letters, numbers, and hyphens`)
  }
  if (!datePattern.test(publishedAt)) {
    throw new Error(`${displayPath}: "publishedAt" must use YYYY-MM-DD`)
  }
  if (
    !Array.isArray(data.tags) ||
    data.tags.length === 0 ||
    data.tags.some((tag) => typeof tag !== 'string' || tag.trim() === '')
  ) {
    throw new Error(`${displayPath}: "tags" must be a non-empty string array`)
  }
  if (content.trim() === '') {
    throw new Error(`${displayPath}: article content must not be empty`)
  }
  const wordCount = countContentWords(content)
  const readingMinutes = Math.max(1, Math.ceil(wordCount / 350))
  const normalizedContent = rewriteMarkdownAssetReferences(
    `${content.trim()}\n`,
    sourcePath,
    slug,
    displayPath,
    assets,
  )

  return {
    article: {
      slug,
      title,
      summary,
      publishedAt,
      category,
      tags: data.tags.map((tag) => tag.trim()),
      coverImage: resolveArticleImage(coverImage, sourcePath, slug, displayPath, assets),
      wordCount,
      readingMinutes,
      contentPath: `content/articles/${slug}.md`,
    },
    assets,
    content: normalizedContent,
  }
}

const createFacetStats = (articles, selectValues) => {
  const counts = new Map()

  for (const article of articles) {
    for (const value of selectValues(article)) {
      counts.set(value, (counts.get(value) ?? 0) + 1)
    }
  }

  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((left, right) => left.name.localeCompare(right.name, 'zh-CN'))
}

const buildContent = async () => {
  const sourceFiles = await collectMarkdownFiles(postsRoot)
  const parsedPosts = await Promise.all(sourceFiles.map(parsePost))
  const slugs = new Set()

  for (const { article } of parsedPosts) {
    if (slugs.has(article.slug)) {
      throw new Error(`Duplicate article slug: ${article.slug}`)
    }
    slugs.add(article.slug)
  }

  const articles = parsedPosts
    .map(({ article }) => article)
    .sort(
      (left, right) =>
        right.publishedAt.localeCompare(left.publishedAt) ||
        left.slug.localeCompare(right.slug),
    )
  const categories = createFacetStats(articles, (article) => [article.category])
  const tags = createFacetStats(articles, (article) => article.tags)
  const stats = {
    articleCount: articles.length,
    categoryCount: categories.length,
    tagCount: tags.length,
    totalWordCount: articles.reduce((sum, article) => sum + article.wordCount, 0),
    latestPublishedAt: articles[0]?.publishedAt ?? '',
  }

  await rm(outputRoot, { recursive: true, force: true })
  await mkdir(articlesOutputRoot, { recursive: true })

  await Promise.all(
    parsedPosts.map(({ article, content }) =>
      writeFile(join(articlesOutputRoot, `${article.slug}.md`), content),
    ),
  )
  const assets = new Map()
  for (const post of parsedPosts) {
    for (const asset of post.assets) {
      assets.set(asset.outputPath, asset)
    }
  }
  await Promise.all(
    Array.from(assets.values()).map(async (asset) => {
      await mkdir(dirname(asset.outputPath), { recursive: true })
      await copyFile(asset.sourcePath, asset.outputPath)
    }),
  )
  await writeFile(
    join(outputRoot, 'index.json'),
    `${JSON.stringify({ schemaVersion: 1, stats, categories, tags, articles }, null, 2)}\n`,
  )

  console.log(`Generated ${articles.length} articles in ${relative(repositoryRoot, outputRoot)}`)
}

await buildContent()
