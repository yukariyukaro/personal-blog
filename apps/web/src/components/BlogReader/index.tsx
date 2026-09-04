import { Bilibili, Github } from '@lobehub/icons'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  fetchArticleContent,
  fetchArticleIndex,
  resolveContentAsset,
  type ArticleIndex,
  type ArticleSummary,
} from '../../utils/contentApi'
import { resolvePublicAsset } from '../../utils/baseUrl'
import { QQIcon } from '../Icons/QQIcon'
import './BlogReader.css'
import './BlogReaderTheme.css'

const formatNumber = (value: number) => new Intl.NumberFormat('zh-CN').format(value)

const resolveDisplayImage = (imagePath: string) => {
  if (/^(?:https?:)?\/\//.test(imagePath) || imagePath.startsWith('data:')) {
    return imagePath
  }
  if (imagePath.startsWith('content/')) {
    return resolveContentAsset(imagePath)
  }
  return resolvePublicAsset(imagePath)
}

function BlogReader() {
  const articleSectionRef = useRef<HTMLElement | null>(null)
  const [articleIndex, setArticleIndex] = useState<ArticleIndex | null>(null)
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [loadedArticles, setLoadedArticles] = useState<Record<string, string>>({})
  const [indexError, setIndexError] = useState(false)
  const [failedSlug, setFailedSlug] = useState<string | null>(null)
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle')
  const [now, setNow] = useState(() => new Date())
  const articles = articleIndex?.articles ?? null
  const stats = articleIndex?.stats ?? null
  const categories = articleIndex?.categories ?? []

  const selectedArticle = useMemo(
    () => articles?.find((article) => article.slug === selectedSlug) ?? null,
    [articles, selectedSlug],
  )
  const articleContent = selectedSlug ? loadedArticles[selectedSlug] ?? null : null
  const contentError = failedSlug === selectedSlug
  const visibleArticles = useMemo(
    () =>
      activeCategory
        ? articles?.filter((article) => article.category === activeCategory) ?? []
        : articles ?? [],
    [activeCategory, articles],
  )
  const featuredArticles = visibleArticles.slice(0, 2)
  const spotlightArticle = selectedArticle ?? articles?.[0] ?? null
  const profileImage = resolvePublicAsset('home/miku_点赞.jpg')
  const bannerImage = resolvePublicAsset('information/background.webp')

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

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setNow(new Date())
    }, 30_000)

    return () => {
      window.clearInterval(timerId)
    }
  }, [])

  const openArticle = (article: ArticleSummary) => {
    setSelectedSlug(article.slug)
    window.requestAnimationFrame(() => {
      articleSectionRef.current?.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 'auto'
          : 'smooth',
        block: 'start',
      })
    })
  }

  const copyEmail = () => {
    navigator.clipboard.writeText('1981805808@qq.com').then(() => {
      setCopyStatus('copied')
      window.setTimeout(() => {
        setCopyStatus('idle')
      }, 1800)
    })
  }

  if (indexError) {
    return (
      <section className="blog-hub" aria-label="博客内容">
        <p className="blog-hub__error" role="alert">
          文章目录加载失败，请刷新页面重试。
        </p>
      </section>
    )
  }

  return (
    <section
      className="blog-reader"
      aria-label="博客内容"
      style={{ '--blog-reader-background': `url(${bannerImage})` } as CSSProperties}
    >
      <div className="blog-dashboard">
        <aside className="blog-sidebar blog-sidebar--left" aria-label="作者信息">
          <section className="blog-card profile-card">
            <div className="profile-card__avatar">
              <img src={profileImage} alt="娄宿三" />
            </div>
            <h2 className="profile-card__name">娄宿三</h2>
            <p className="profile-card__bio">Hamal / 前端开发者</p>
            <div className="profile-card__socials">
              <a href="https://github.com/YukariYukaro" target="_blank" rel="noreferrer" aria-label="GitHub">
                <Github />
              </a>
              <a href="https://space.bilibili.com/39374538" target="_blank" rel="noreferrer" aria-label="Bilibili">
                <Bilibili />
              </a>
              <button type="button" onClick={copyEmail} aria-label="复制 QQ 邮箱">
                <QQIcon />
              </button>
            </div>
            <p className="profile-card__copy-status" aria-live="polite">
              {copyStatus === 'copied' ? '邮箱已复制' : null}
            </p>
            <div className="profile-card__stats">
              <div className="stat-box">
                <span className="stat-label">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                  累计访客
                </span>
                <span className="stat-value stat-value--pending">待接入</span>
              </div>
              <div className="stat-box">
                <span className="stat-label">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                  总浏览量
                </span>
                <span className="stat-value stat-value--pending">待接入</span>
              </div>
            </div>
          </section>

          <section className="blog-card welcome-card">
            <h3 className="card-title">
              <span className="title-icon">📢</span> 欢迎来访
            </h3>
            <p className="welcome-text">
              我想要一个真正属于自己的内容空间。这里不只是用来发文章，也用来整理项目、记录折腾过程，放一些自己喜欢的页面和小工具。
            </p>
            <button className="welcome-btn" type="button">了解更多</button>
          </section>

          <section className="blog-card quote-card">
            <h3 className="card-title">
              <span className="title-icon">💡</span> 今日一言
            </h3>
            <p className="quote-text">“纸上得来终觉浅，绝知此事要躬行。”</p>
            <span className="quote-author">—— 陆游</span>
          </section>
        </aside>

        <main className="blog-main">
          <nav className="blog-categories" aria-label="文章分类">
            <button
              className={`category-btn ${activeCategory === null ? 'is-active' : ''}`}
              type="button"
              onClick={() => setActiveCategory(null)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
              归档
              <span className="category-count">{stats?.articleCount ?? 0}</span>
            </button>
            {categories.map((category) => (
              <button
                className={`category-btn ${activeCategory === category.name ? 'is-active' : ''}`}
                type="button"
                key={category.name}
                onClick={() => setActiveCategory(category.name)}
              >
                {category.name}
                <span className="category-count">{category.count}</span>
              </button>
            ))}
          </nav>

          <div className="blog-article-grid">
            {featuredArticles.map((article) => (
              <article
                className="featured-article"
                key={article.slug}
                onClick={() => openArticle(article)}
              >
                {article.coverImage ? (
                  <div className="featured-article__cover">
                    <img
                      src={resolveDisplayImage(article.coverImage)}
                      alt={article.title}
                      loading="lazy"
                    />
                  </div>
                ) : null}
                <div className="featured-article__content">
                  <h2 className="featured-article__title">{article.title}</h2>
                  <div className="featured-article__tags">
                    <span className="tag-pill tag-pill--primary">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                      {article.category}
                    </span>
                    {article.tags.map((t) => (
                      <span className="tag-pill" key={t}># {t}</span>
                    ))}
                  </div>
                  <p className="featured-article__summary">{article.summary}</p>
                  <div className="featured-article__meta">
                    <span>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                      {article.publishedAt}
                    </span>
                    <span>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                      {formatNumber(article.wordCount)} 字
                    </span>
                    <span>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                      {article.readingMinutes} 分钟
                    </span>
                  </div>
                </div>
              </article>
            ))}

            {visibleArticles.slice(2).map((article) => (
              <article
                className="featured-article"
                key={article.slug}
                onClick={() => openArticle(article)}
              >
                {article.coverImage ? (
                  <div className="featured-article__cover">
                    <img
                      src={resolveDisplayImage(article.coverImage)}
                      alt={article.title}
                      loading="lazy"
                    />
                  </div>
                ) : null}
                <div className="featured-article__content">
                  <h2 className="featured-article__title">{article.title}</h2>
                  <div className="featured-article__tags">
                    <span className="tag-pill tag-pill--primary">{article.category}</span>
                    {article.tags.map((t) => (
                      <span className="tag-pill" key={t}># {t}</span>
                    ))}
                  </div>
                  <p className="featured-article__summary">{article.summary}</p>
                  <div className="featured-article__meta">
                    <span>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                      {article.publishedAt}
                    </span>
                    <span>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2 2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
                      {formatNumber(article.wordCount)} 字
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </main>

        <aside className="blog-sidebar blog-sidebar--right" aria-label="站点信息">
          <section className="blog-card clock-card">
            <div className="clock-header">
              <span>上午好，充满活力！</span>
              <span className="weather-icon" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fca5a5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
              </span>
            </div>
            <div className="clock-time">
              <span className="time-hm">
                {new Intl.DateTimeFormat('zh-CN', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false,
                }).format(now)}
              </span>
              <span className="time-date">
                <span className="day">
                  {new Intl.DateTimeFormat('en-US', {
                    weekday: 'long',
                  }).format(now).toUpperCase()}
                </span>
                <span className="date">
                  {new Intl.DateTimeFormat('zh-CN', {
                    month: '2-digit',
                    day: '2-digit',
                  }).format(now)}
                </span>
              </span>
            </div>
          </section>

          {spotlightArticle?.coverImage ? (
            <section className="blog-card image-card">
              <img
                src={resolveDisplayImage(spotlightArticle.coverImage)}
                alt={spotlightArticle.title}
                loading="lazy"
              />
            </section>
          ) : null}

          <section className="blog-card stats-card">
            <h3 className="card-title">
              <span className="title-bar"></span> 站点统计
            </h3>
            <ul className="stats-list">
              <li>
                <span className="stat-name">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                  文章
                </span>
                <span className="stat-val">
                  {stats ? formatNumber(stats.articleCount) : '...'}
                </span>
              </li>
              <li>
                <span className="stat-name">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                  分类
                </span>
                <span className="stat-val">
                  {stats ? formatNumber(stats.categoryCount) : '...'}
                </span>
              </li>
              <li>
                <span className="stat-name">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
                  标签
                </span>
                <span className="stat-val">
                  {stats ? formatNumber(stats.tagCount) : '...'}
                </span>
              </li>
              <li>
                <span className="stat-name">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
                  总字数
                </span>
                <span className="stat-val">
                  {stats ? formatNumber(stats.totalWordCount) : '...'}
                </span>
              </li>
              <li>
                <span className="stat-name">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                  最近更新
                </span>
                <span className="stat-val">{stats?.latestPublishedAt ?? '...'}</span>
              </li>
            </ul>
          </section>
        </aside>
      </div>

      <section
        ref={articleSectionRef}
        className="blog-document"
        aria-labelledby="blog-document-title"
      >
        {selectedArticle ? (
          <>
            <header className="blog-document__header">
              <div>
                <span>READING</span>
                <h2 id="blog-document-title">{selectedArticle.title}</h2>
              </div>
              <div>
                <time dateTime={selectedArticle.publishedAt}>
                  {selectedArticle.publishedAt}
                </time>
                <span>{selectedArticle.tags.join(' / ')}</span>
              </div>
            </header>

            {contentError ? (
              <p className="blog-hub__error" role="alert">
                文章正文加载失败，请选择其他文章或刷新页面。
              </p>
            ) : articleContent ? (
              <article className="markdown-body">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    a: ({ href, ...props }) => {
                      const isExternal = href?.startsWith('http')
                      return (
                        <a
                          {...props}
                          href={href}
                          target={isExternal ? '_blank' : undefined}
                          rel={isExternal ? 'noreferrer' : undefined}
                        />
                      )
                    },
                    img: ({ src, ...props }) => (
                      <img
                        {...props}
                        src={src ? resolveDisplayImage(src) : undefined}
                        loading="lazy"
                      />
                    ),
                  }}
                >
                  {articleContent}
                </ReactMarkdown>
              </article>
            ) : (
              <div className="blog-document__skeleton" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
            )}
          </>
        ) : null}
      </section>
    </section>
  )
}

export default BlogReader
