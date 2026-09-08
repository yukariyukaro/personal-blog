import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  fetchArticleContent,
  fetchArticleIndex,
  type ArticleIndex,
  type ArticleSummary,
} from '../../../utils/contentApi'

export function useArticleLibrary(requestedSlug: string | null) {
  const [articleIndex, setArticleIndex] = useState<ArticleIndex | null>(null)
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null)
  const [loadedArticles, setLoadedArticles] = useState<Record<string, string>>({})
  const [indexError, setIndexError] = useState(false)
  const [failedSlug, setFailedSlug] = useState<string | null>(null)

  useEffect(() => {
    let isCancelled = false

    fetchArticleIndex()
      .then((index) => {
        if (isCancelled) {
          return
        }
        setArticleIndex(index)
        setSelectedSlug(index.articles[0]?.slug ?? null)
      })
      .catch(() => {
        if (!isCancelled) {
          setIndexError(true)
        }
      })

    return () => {
      isCancelled = true
    }
  }, [])

  const articles = articleIndex?.articles ?? null
  const effectiveSelectedSlug = useMemo(() => {
    if (
      requestedSlug &&
      articles?.some((article) => article.slug === requestedSlug)
    ) {
      return requestedSlug
    }
    return selectedSlug
  }, [articles, requestedSlug, selectedSlug])

  const selectedArticle = useMemo(
    () =>
      articles?.find((article) => article.slug === effectiveSelectedSlug) ?? null,
    [articles, effectiveSelectedSlug],
  )
  const articleContent = effectiveSelectedSlug
    ? loadedArticles[effectiveSelectedSlug] ?? null
    : null

  useEffect(() => {
    if (!selectedArticle || loadedArticles[selectedArticle.slug]) {
      return
    }

    let isCancelled = false
    fetchArticleContent(selectedArticle.contentPath)
      .then((content) => {
        if (!isCancelled) {
          setLoadedArticles((current) => ({
            ...current,
            [selectedArticle.slug]: content,
          }))
          setFailedSlug(null)
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setFailedSlug(selectedArticle.slug)
        }
      })

    return () => {
      isCancelled = true
    }
  }, [loadedArticles, selectedArticle])

  const selectArticle = useCallback((article: ArticleSummary) => {
    setSelectedSlug(article.slug)
  }, [])

  return {
    articles,
    stats: articleIndex?.stats ?? null,
    categories: articleIndex?.categories ?? [],
    tags: articleIndex?.tags ?? [],
    selectedArticle,
    articleContent,
    contentError: failedSlug === effectiveSelectedSlug,
    indexError,
    selectArticle,
  }
}
