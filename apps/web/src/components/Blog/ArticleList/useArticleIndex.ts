import { useEffect, useState } from 'react'
import { fetchArticleIndex, type ArticleIndex } from '../../../utils/contentApi'

export function useArticleIndex() {
  const [articleIndex, setArticleIndex] = useState<ArticleIndex | null>(null)
  const [indexError, setIndexError] = useState(false)

  useEffect(() => {
    let isCancelled = false

    fetchArticleIndex()
      .then((index) => {
        if (isCancelled) {
          return
        }
        setArticleIndex(index)
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

  return {
    articles: articleIndex?.articles ?? null,
    stats: articleIndex?.stats ?? null,
    categories: articleIndex?.categories ?? [],
    tags: articleIndex?.tags ?? [],
    indexError,
  }
}
