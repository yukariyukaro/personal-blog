import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { siteProfile } from '../../../config/siteProfile'
import {
  fetchArticleContent,
  type ArticleSummary,
} from '../../../utils/contentApi'
import { READER_BACKGROUND_IMAGE, filterArticles } from '../contentUtils'
import ReadingControls from '../ReadingControls'
import ArticleCatalog from './ArticleCatalog'
import BlogSidebar from './BlogSidebar'
import { useArticleIndex } from './useArticleIndex'
import './ArticleList.css'

const COPY_STATUS_DURATION = 1800

export default function ArticleList() {
  const sectionRef = useRef<HTMLElement | null>(null)
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const copyEmailTimerRef = useRef<number | null>(null)
  const copyEmailRequestRef = useRef(0)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle')
  const [now, setNow] = useState(() => new Date())
  const navigate = useNavigate()
  const { articles, stats, categories, tags, indexError } = useArticleIndex()

  const visibleArticles = useMemo(
    () => filterArticles(articles, activeCategory, activeTag, searchQuery),
    [activeCategory, activeTag, articles, searchQuery],
  )
  const spotlightArticle = articles?.[0] ?? null

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

  useEffect(
    () => () => {
      copyEmailRequestRef.current += 1
      if (copyEmailTimerRef.current !== null) {
        window.clearTimeout(copyEmailTimerRef.current)
      }
    },
    [],
  )

  const openArticle = useCallback(
    (article: ArticleSummary) => {
      navigate(`/Post/${article.slug}`)
    },
    [navigate],
  )

  // 指针意图预取：让进入文章页时路由 chunk 与正文数据都已就绪
  const prefetchArticle = useCallback((article: ArticleSummary) => {
    void import('../ArticleReader')
    void fetchArticleContent(article.contentPath).catch(() => undefined)
  }, [])

  const copyEmail = useCallback(async () => {
    if (!siteProfile.email) {
      return
    }

    const requestId = ++copyEmailRequestRef.current
    if (copyEmailTimerRef.current !== null) {
      window.clearTimeout(copyEmailTimerRef.current)
      copyEmailTimerRef.current = null
    }
    setCopyStatus('idle')
    try {
      await navigator.clipboard.writeText(siteProfile.email)
      if (copyEmailRequestRef.current !== requestId) {
        return
      }
      setCopyStatus('copied')
      copyEmailTimerRef.current = window.setTimeout(() => {
        copyEmailTimerRef.current = null
        setCopyStatus('idle')
      }, COPY_STATUS_DURATION)
    } catch {
      if (copyEmailRequestRef.current === requestId) {
        setCopyStatus('idle')
      }
    }
  }, [])

  if (indexError) {
    return (
      <section className="blog-reader" aria-label="博客内容">
        <div className="blog-reader__backdrop" aria-hidden="true" />
        <p className="blog-hub__error" role="alert">
          文章目录加载失败，请刷新页面重试。
        </p>
      </section>
    )
  }

  return (
    <section
      ref={sectionRef}
      className="blog-reader"
      aria-label="博客内容"
      style={
        {
          '--blog-reader-background': `url(${READER_BACKGROUND_IMAGE})`,
        } as CSSProperties
      }
    >
      <div className="blog-reader__backdrop" aria-hidden="true" />
      <ReadingControls articleSectionRef={sectionRef} />

      <div className="blog-dashboard">
        <BlogSidebar
          side="left"
          stats={stats}
          spotlightArticle={spotlightArticle}
          now={now}
          copyStatus={copyStatus}
          onCopyEmail={copyEmail}
          onFocusSearch={focusSearch}
        />
        <ArticleCatalog
          articles={articles}
          categories={categories}
          tags={tags}
          stats={stats}
          activeCategory={activeCategory}
          activeTag={activeTag}
          searchQuery={searchQuery}
          searchInputRef={searchInputRef}
          visibleArticles={visibleArticles}
          onSearchChange={setSearchQuery}
          onCategoryChange={setActiveCategory}
          onTagChange={setActiveTag}
          onOpenArticle={openArticle}
          onPrefetchArticle={prefetchArticle}
        />
        <BlogSidebar
          side="right"
          stats={stats}
          spotlightArticle={spotlightArticle}
          now={now}
          copyStatus={copyStatus}
          onCopyEmail={copyEmail}
          onFocusSearch={focusSearch}
        />
      </div>
    </section>
  )
}
