import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  fetchArticleContent,
  fetchArticleIndex,
} from '../../../utils/contentApi'
import type { ArticleSummary } from '../../../utils/contentApi'

export type OnlineArticles = {
  articles: ArticleSummary[]
  visibleArticles: ArticleSummary[]
  query: string
  setQuery: (value: string) => void
  isLoading: boolean
  error: string | null
  readArticle: (summary: ArticleSummary) => Promise<string | null>
}

export function useOnlineArticles(): OnlineArticles {
  const [articles, setArticles] = useState<ArticleSummary[]>([])
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    fetchArticleIndex()
      .then((index) => {
        if (cancelled) {
          return
        }
        setArticles(index.articles)
        setError(null)
      })
      .catch(() => {
        if (!cancelled) {
          setError('无法加载线上文章索引。')
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  const visibleArticles = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    if (keyword === '') {
      return articles
    }

    return articles.filter(
      (article) =>
        article.title.toLowerCase().includes(keyword) ||
        article.summary.toLowerCase().includes(keyword) ||
        article.tags.some((tag) => tag.toLowerCase().includes(keyword)),
    )
  }, [articles, query])

  const readArticle = useCallback(async (summary: ArticleSummary) => {
    try {
      return await fetchArticleContent(summary.contentPath)
    } catch {
      return null
    }
  }, [])

  return {
    articles,
    visibleArticles,
    query,
    setQuery,
    isLoading,
    error,
    readArticle,
  }
}
