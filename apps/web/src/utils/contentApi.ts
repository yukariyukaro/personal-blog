import { BASE_URL } from './baseUrl'

export type ArticleSummary = {
  slug: string
  title: string
  summary: string
  publishedAt: string
  category: string
  tags: string[]
  coverImage: string
  wordCount: number
  readingMinutes: number
  contentPath: string
}

export type ArticleFacetStat = {
  name: string
  count: number
}

export type ArticleIndexStats = {
  articleCount: number
  categoryCount: number
  tagCount: number
  totalWordCount: number
  latestPublishedAt: string
}

export type ArticleIndex = {
  schemaVersion: 1
  stats: ArticleIndexStats
  categories: ArticleFacetStat[]
  tags: ArticleFacetStat[]
  articles: ArticleSummary[]
}

export const resolveContentAsset = (assetPath: string) =>
  `${BASE_URL}${assetPath.replace(/^\/+/, '')}`

export const fetchArticleIndex = async (): Promise<ArticleIndex> => {
  const response = await fetch(resolveContentAsset('content/index.json'), {
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch article index: ${response.status}`)
  }

  return response.json() as Promise<ArticleIndex>
}

export const fetchArticleContent = async (
  contentPath: string,
): Promise<string> => {
  const response = await fetch(resolveContentAsset(contentPath), {
    headers: {
      Accept: 'text/markdown',
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch article content: ${response.status}`)
  }

  return response.text()
}
