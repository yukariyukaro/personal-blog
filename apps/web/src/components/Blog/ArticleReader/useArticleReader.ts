import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { MouseEvent } from 'react'
import {
  fetchArticleContent,
  fetchArticleIndex,
  type ArticleSummary,
} from '../../../utils/contentApi'
import type { ArticleHeading } from '../types'

const COPY_STATUS_DURATION = 1800

const slugifyHeading = (text: string, index: number) => {
  const slug = text
    .trim()
    .toLocaleLowerCase()
    .replace(/[`*_~[\]{}]/g, '')
    .replace(
      /[^\p{Letter}\p{Number}\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]+/gu,
      '-',
    )
    .replace(/^-+|-+$/g, '')

  return slug || `section-${index + 1}`
}

const extractHeadings = (content: string): ArticleHeading[] => {
  const usedIds = new Map<string, number>()
  const headings: ArticleHeading[] = []
  const pattern = /^(#{2,3})\s+(.+?)\s*#*\s*$/gm
  let match: RegExpExecArray | null

  while ((match = pattern.exec(content))) {
    const level = match[1].length as 2 | 3
    const text = match[2].trim()
    const baseId = slugifyHeading(text, headings.length)
    const occurrence = usedIds.get(baseId) ?? 0
    usedIds.set(baseId, occurrence + 1)
    headings.push({
      id: occurrence === 0 ? baseId : `${baseId}-${occurrence + 1}`,
      level,
      line: content.slice(0, match.index).split('\n').length,
      text,
    })
  }

  return headings
}

export type ArticleReaderStatus = 'loading' | 'not-found' | 'ready' | 'error'

export function useArticleReader(slug: string | undefined) {
  const [articles, setArticles] = useState<ArticleSummary[] | null>(null)
  const [loadedArticles, setLoadedArticles] = useState<Record<string, string>>({})
  const [failedSlug, setFailedSlug] = useState<string | null>(null)
  const [indexError, setIndexError] = useState(false)
  const [activeHeadingId, setActiveHeadingId] = useState<string | null>(null)
  const [shareStatus, setShareStatus] = useState<'idle' | 'copied'>('idle')
  const copyArticleLinkTimerRef = useRef<number | null>(null)
  const copyArticleLinkRequestRef = useRef(0)

  useEffect(() => {
    let isCancelled = false

    fetchArticleIndex()
      .then((index) => {
        if (!isCancelled) {
          setArticles(index.articles)
        }
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

  const article = useMemo(() => {
    if (!articles || slug === undefined) {
      return null
    }
    return articles.find((item) => item.slug === slug) ?? null
  }, [articles, slug])

  const articleContent = article ? loadedArticles[article.slug] ?? null : null

  useEffect(() => {
    if (!article || loadedArticles[article.slug]) {
      return
    }

    const targetSlug = article.slug
    let isCancelled = false
    fetchArticleContent(article.contentPath)
      .then((content) => {
        if (isCancelled) {
          return
        }
        setLoadedArticles((current) => ({ ...current, [targetSlug]: content }))
        setFailedSlug(null)
      })
      .catch(() => {
        if (!isCancelled) {
          setFailedSlug(targetSlug)
        }
      })

    return () => {
      isCancelled = true
    }
  }, [article, loadedArticles])

  useEffect(
    () => () => {
      copyArticleLinkRequestRef.current += 1
      if (copyArticleLinkTimerRef.current !== null) {
        window.clearTimeout(copyArticleLinkTimerRef.current)
      }
    },
    [],
  )

  const articleHeadings = useMemo(
    () => (articleContent ? extractHeadings(articleContent) : []),
    [articleContent],
  )
  const displayedActiveHeadingId = articleHeadings.some(
    (heading) => heading.id === activeHeadingId,
  )
    ? activeHeadingId
    : null

  const relatedArticles = useMemo(() => {
    if (!articles || !article) {
      return []
    }

    const currentArticle = article
    const selectedTags = new Set(currentArticle.tags)

    return articles
      .map((candidate, index) => ({
        candidate,
        index,
        sameCategory: candidate.category === currentArticle.category,
        sharedTagCount: candidate.tags.filter((tag) => selectedTags.has(tag))
          .length,
      }))
      .filter(
        ({ candidate, sameCategory, sharedTagCount }) =>
          candidate.slug !== currentArticle.slug &&
          (sameCategory || sharedTagCount > 0),
      )
      .sort(
        (left, right) =>
          Number(right.sameCategory) - Number(left.sameCategory) ||
          right.sharedTagCount - left.sharedTagCount ||
          right.candidate.publishedAt.localeCompare(left.candidate.publishedAt) ||
          left.index - right.index,
      )
      .slice(0, 3)
      .map(({ candidate }) => candidate)
  }, [articles, article])

  const navigateToHeading = useCallback(
    (event: MouseEvent<HTMLAnchorElement>, id: string) => {
      event.preventDefault()
      setActiveHeadingId(id)
      document.getElementById(id)?.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 'auto'
          : 'smooth',
        block: 'start',
      })
    },
    [],
  )

  const copyArticleLink = useCallback(async () => {
    const requestId = ++copyArticleLinkRequestRef.current
    if (copyArticleLinkTimerRef.current !== null) {
      window.clearTimeout(copyArticleLinkTimerRef.current)
      copyArticleLinkTimerRef.current = null
    }
    setShareStatus('idle')
    try {
      await navigator.clipboard.writeText(window.location.href)
      if (copyArticleLinkRequestRef.current !== requestId) {
        return
      }
      setShareStatus('copied')
      copyArticleLinkTimerRef.current = window.setTimeout(() => {
        copyArticleLinkTimerRef.current = null
        setShareStatus('idle')
      }, COPY_STATUS_DURATION)
    } catch {
      if (copyArticleLinkRequestRef.current === requestId) {
        setShareStatus('idle')
      }
    }
  }, [])

  const status: ArticleReaderStatus = indexError
    ? 'error'
    : articles === null
      ? 'loading'
      : article === null
        ? 'not-found'
        : 'ready'

  return {
    status,
    article,
    articleContent,
    contentError: failedSlug === article?.slug,
    articleHeadings,
    activeHeadingId: displayedActiveHeadingId,
    setActiveHeadingId,
    relatedArticles,
    shareStatus,
    copyArticleLink,
    navigateToHeading,
  }
}
