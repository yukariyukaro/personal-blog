import { useCallback, useEffect, useRef } from 'react'
import type { CSSProperties } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { ArticleSummary } from '../../../utils/contentApi'
import { updateSEO } from '../../../utils/seo'
import { READER_BACKGROUND_IMAGE } from '../contentUtils'
import ReadingControls from '../ReadingControls'
import ArticleDocument from './ArticleDocument'
import { ArticleReaderSkeleton } from './ArticleReaderSkeleton'
import { useArticleReader } from './useArticleReader'
import './ArticleReader.css'

export default function ArticleReader() {
  const { slug } = useParams<{ slug: string }>()
  const reader = useArticleReader(slug)
  const documentRef = useRef<HTMLElement | null>(null)
  const navigate = useNavigate()
  const { status, article } = reader

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [slug])

  useEffect(() => {
    if (status === 'ready' && article) {
      updateSEO({
        title: `${article.title} | 娄宿三`,
        description: article.summary,
        keywords: article.tags.join(','),
      })
    }
  }, [article, status])

  const openArticle = useCallback(
    (nextArticle: ArticleSummary) => {
      if (nextArticle.slug === slug) {
        return
      }
      navigate(`/Post/${nextArticle.slug}`)
    },
    [navigate, slug],
  )

  return (
    <section
      className="blog-reader"
      aria-label="文章内容"
      style={
        {
          '--blog-reader-background': `url(${READER_BACKGROUND_IMAGE})`,
        } as CSSProperties
      }
    >
      <div className="blog-reader__backdrop" aria-hidden="true" />
      <ReadingControls articleSectionRef={documentRef} />

      <div className="article-reader">
        <Link className="article-reader__back" to="/Home">
          ← 返回文章列表
        </Link>

        <section ref={documentRef} className="blog-document">
          {status === 'loading' ? <ArticleReaderSkeleton /> : null}

          {status === 'not-found' ? (
            <p className="blog-empty-state">文章不存在，可能已被移动或删除。</p>
          ) : null}

          {status === 'error' ? (
            <p className="blog-hub__error" role="alert">
              文章加载失败，请刷新页面重试。
            </p>
          ) : null}

          {status === 'ready' && article ? (
            <ArticleDocument
              article={article}
              articleContent={reader.articleContent}
              contentError={reader.contentError}
              articleHeadings={reader.articleHeadings}
              activeHeadingId={reader.activeHeadingId}
              onActiveHeadingChange={reader.setActiveHeadingId}
              shareStatus={reader.shareStatus}
              onCopyLink={reader.copyArticleLink}
              relatedArticles={reader.relatedArticles}
              onOpenArticle={openArticle}
              onHeadingNavigation={reader.navigateToHeading}
            />
          ) : null}
        </section>
      </div>
    </section>
  )
}
