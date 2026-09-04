import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { MouseEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { ArticleSummary } from '../../../utils/contentApi'
import { resolvePublicAsset } from '../../../utils/baseUrl'
import { filterArticles } from '../contentUtils'
import type { BlogReaderViewModel } from '../types'
import { useArticleLibrary } from './useArticleLibrary'
import { useArticleReading } from './useArticleReading'

const EMAIL = '1981805808@qq.com'
const COPY_STATUS_DURATION = 1800

const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function useBlogReaderViewModel(): BlogReaderViewModel {
  const articleSectionRef = useRef<HTMLElement | null>(null)
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const [params, setParams] = useSearchParams()
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [shareStatus, setShareStatus] = useState<'idle' | 'copied'>('idle')
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle')
  const [now, setNow] = useState(() => new Date())
  const requestedSlug = params.get('post')
  const library = useArticleLibrary(requestedSlug)
  const reading = useArticleReading(
    library.articleContent,
    articleSectionRef,
    library.selectedArticle?.slug ?? null,
  )
  const setActiveHeadingId = reading.setActiveHeadingId

  const visibleArticles = useMemo(
    () =>
      filterArticles(
        library.articles,
        activeCategory,
        activeTag,
        searchQuery,
      ),
    [activeCategory, activeTag, library.articles, searchQuery],
  )

  const relatedArticles = useMemo(() => {
    if (!library.articles || !library.selectedArticle) {
      return []
    }

    const selectedArticle = library.selectedArticle
    const selectedTags = new Set(selectedArticle.tags)

    return library.articles
      .map((article, index) => ({
        article,
        index,
        sameCategory: article.category === selectedArticle.category,
        sharedTagCount: article.tags.filter((tag) => selectedTags.has(tag)).length,
      }))
      .filter(
        ({ article, sameCategory, sharedTagCount }) =>
          article.slug !== selectedArticle.slug &&
          (sameCategory || sharedTagCount > 0),
      )
      .sort(
        (left, right) =>
          Number(right.sameCategory) - Number(left.sameCategory) ||
          right.sharedTagCount - left.sharedTagCount ||
          right.article.publishedAt.localeCompare(left.article.publishedAt) ||
          left.index - right.index,
      )
      .slice(0, 3)
      .map(({ article }) => article)
  }, [library.articles, library.selectedArticle])

  const focusSearch = useCallback(() => {
    window.setTimeout(() => {
      searchInputRef.current?.focus()
    }, 0)
  }, [])

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setNow(new Date())
    }, 30_000)

    return () => {
      window.clearInterval(timerId)
    }
  }, [])

  useEffect(() => {
    window.addEventListener('blog:focus-search', focusSearch)
    return () => window.removeEventListener('blog:focus-search', focusSearch)
  }, [focusSearch])

  const openArticle = useCallback(
    (article: ArticleSummary) => {
      setShareStatus('idle')
      setParams((currentParams) => {
        const nextParams = new URLSearchParams(currentParams)
        nextParams.set('post', article.slug)
        return nextParams
      })
      window.requestAnimationFrame(() => {
        articleSectionRef.current?.scrollIntoView({
          behavior: prefersReducedMotion() ? 'auto' : 'smooth',
          block: 'start',
        })
      })
    },
    [setParams],
  )

  const copyEmail = useCallback(async () => {
    setCopyStatus('idle')
    try {
      await navigator.clipboard.writeText(EMAIL)
      setCopyStatus('copied')
      window.setTimeout(() => setCopyStatus('idle'), COPY_STATUS_DURATION)
    } catch {
      setCopyStatus('idle')
    }
  }, [])

  const copyArticleLink = useCallback(async () => {
    setShareStatus('idle')
    try {
      await navigator.clipboard.writeText(window.location.href)
      setShareStatus('copied')
      window.setTimeout(() => setShareStatus('idle'), COPY_STATUS_DURATION)
    } catch {
      setShareStatus('idle')
    }
  }, [])

  const navigateToHeading = useCallback(
    (event: MouseEvent<HTMLAnchorElement>, id: string) => {
      event.preventDefault()
      setActiveHeadingId(id)
      document.getElementById(id)?.scrollIntoView({
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
        block: 'start',
      })
    },
    [setActiveHeadingId],
  )

  const scrollToTop = useCallback(() => {
    window.scrollTo({
      top: 0,
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    })
  }, [])

  return {
    articleSectionRef,
    searchInputRef,
    readerBackgroundImage: resolvePublicAsset('information/background.webp'),
    articles: library.articles,
    visibleArticles,
    selectedArticle: library.selectedArticle,
    spotlightArticle: library.selectedArticle ?? library.articles?.[0] ?? null,
    articleContent: library.articleContent,
    relatedArticles,
    categories: library.categories,
    tags: library.tags,
    stats: library.stats,
    articleHeadings: reading.articleHeadings,
    activeHeadingId: reading.activeHeadingId,
    activeCategory,
    activeTag,
    searchQuery,
    readingProgress: reading.readingProgress,
    isBackToTopVisible: reading.isBackToTopVisible,
    indexError: library.indexError,
    contentError: library.contentError,
    shareStatus,
    copyStatus,
    now,
    openArticle,
    setActiveCategory,
    setActiveTag,
    setSearchQuery,
    focusSearch,
    copyEmail,
    copyArticleLink,
    scrollToTop,
    navigateToHeading,
  }
}
