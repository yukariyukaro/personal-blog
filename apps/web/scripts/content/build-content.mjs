import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, isAbsolute, join, relative, resolve } from 'node:path'
import matter from 'gray-matter'
import { parseArticleFrontmatter } from './article-schema.mjs'
import { discoverPosts } from './discover-posts.mjs'

const markdownImagePattern = /(!\[[^\]]*]\()([^)\s]+)([^)]*\))/g

const isExternalReference = (value) =>
  /^(?:https?:)?\/\//.test(value) ||
  value.startsWith('data:') ||
  value.startsWith('#')

const toPublicPath = (path) => path.replace(/\\/g, '/')

const createPostAsset = ({
  sourcePath,
  outputRoot,
  slug,
  assetPath,
  displayPath,
}) => {
  const sourceDir = dirname(sourcePath)
  const absoluteSourcePath = resolve(sourceDir, assetPath)
  const relativeAssetPath = relative(sourceDir, absoluteSourcePath)

  if (relativeAssetPath.startsWith('..') || isAbsolute(relativeAssetPath)) {
    throw new Error(
      `${displayPath}: asset path must stay inside the article directory`,
    )
  }

  return {
    sourcePath: absoluteSourcePath,
    outputPath: join(outputRoot, 'assets', slug, relativeAssetPath),
    contentPath: `content/assets/${slug}/${toPublicPath(relativeAssetPath)}`,
  }
}

const resolveArticleImage = ({
  value,
  sourcePath,
  outputRoot,
  slug,
  displayPath,
  assets,
}) => {
  if (isExternalReference(value)) {
    return value
  }
  if (value.startsWith('/')) {
    return value.replace(/^\/+/, '')
  }

  const asset = createPostAsset({
    sourcePath,
    outputRoot,
    slug,
    assetPath: value,
    displayPath,
  })
  assets.push(asset)
  return asset.contentPath
}

const rewriteMarkdownAssetReferences = ({
  content,
  sourcePath,
  outputRoot,
  slug,
  displayPath,
  assets,
}) =>
  content.replace(markdownImagePattern, (match, prefix, assetPath, suffix) => {
    if (isExternalReference(assetPath) || assetPath.startsWith('/')) {
      return match
    }

    const [, pathname = assetPath, trailing = ''] =
      assetPath.match(/^([^?#]*)(.*)$/) ?? []
    const asset = createPostAsset({
      sourcePath,
      outputRoot,
      slug,
      assetPath: pathname,
      displayPath,
    })
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

const parsePost = async (sourcePath, postsRoot, outputRoot) => {
  const source = await readFile(sourcePath, 'utf8')
  const { data, content } = matter(source)
  const displayPath = toPublicPath(relative(postsRoot, sourcePath))
  const frontmatter = parseArticleFrontmatter(data, displayPath)
  const { coverImage, ...articleFrontmatter } = frontmatter
  const assets = []

  if (content.trim() === '') {
    throw new Error(`${displayPath}: article content must not be empty`)
  }

  const wordCount = countContentWords(content)
  const normalizedContent = rewriteMarkdownAssetReferences({
    content: `${content.trim()}\n`,
    sourcePath,
    outputRoot,
    slug: frontmatter.slug,
    displayPath,
    assets,
  })

  return {
    article: {
      ...articleFrontmatter,
      ...(coverImage === undefined
        ? {}
        : {
            coverImage: resolveArticleImage({
              value: coverImage,
              sourcePath,
              outputRoot,
              slug: frontmatter.slug,
              displayPath,
              assets,
            }),
          }),
      wordCount,
      readingMinutes: Math.max(1, Math.ceil(wordCount / 350)),
      contentPath: `content/articles/${frontmatter.slug}.md`,
    },
    assets,
    content: normalizedContent,
  }
}

const compareArticles = (left, right) => {
  const pinnedOrder = Number(right.pinned === true) - Number(left.pinned === true)
  if (pinnedOrder !== 0) {
    return pinnedOrder
  }

  const leftHasPriority = left.priority !== undefined
  const rightHasPriority = right.priority !== undefined
  if (leftHasPriority && rightHasPriority && left.priority !== right.priority) {
    return right.priority - left.priority
  }
  if (leftHasPriority !== rightHasPriority) {
    return leftHasPriority ? -1 : 1
  }

  return (
    right.publishedAt.localeCompare(left.publishedAt) ||
    left.slug.localeCompare(right.slug)
  )
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

const assertUniqueSlugs = (parsedPosts) => {
  const slugs = new Set()
  for (const { article } of parsedPosts) {
    if (slugs.has(article.slug)) {
      throw new Error(`Duplicate article slug: ${article.slug}`)
    }
    slugs.add(article.slug)
  }
}

const writeContent = async (outputRoot, parsedPosts, index) => {
  const articlesOutputRoot = join(outputRoot, 'articles')
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
    `${JSON.stringify(index, null, 2)}\n`,
  )
}

export const buildContent = async ({
  postsRoot,
  outputRoot,
  includeDrafts = false,
}) => {
  const sourceFiles = await discoverPosts(postsRoot)
  const parsedPosts = await Promise.all(
    sourceFiles.map((sourcePath) => parsePost(sourcePath, postsRoot, outputRoot)),
  )
  assertUniqueSlugs(parsedPosts)

  const includedPosts = includeDrafts
    ? parsedPosts
    : parsedPosts.filter(({ article }) => article.draft !== true)
  const articles = includedPosts
    .map(({ article }) => article)
    .sort(compareArticles)
  const categories = createFacetStats(articles, (article) => [article.category])
  const tags = createFacetStats(articles, (article) => article.tags)
  const latestPublishedAt = articles.reduce(
    (latest, article) =>
      article.publishedAt > latest ? article.publishedAt : latest,
    '',
  )
  const stats = {
    articleCount: articles.length,
    categoryCount: categories.length,
    tagCount: tags.length,
    totalWordCount: articles.reduce(
      (sum, article) => sum + article.wordCount,
      0,
    ),
    latestPublishedAt,
  }

  await writeContent(outputRoot, includedPosts, {
    schemaVersion: 1,
    stats,
    categories,
    tags,
    articles,
  })

  console.log(`Generated ${articles.length} articles in ${outputRoot}`)
}
