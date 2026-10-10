import { lazy, Suspense } from 'react'
import type { MouseEvent } from 'react'
import type { ArticleSummary } from '../../../utils/contentApi'
import type { ArticleHeading, ArticleTocProps } from '../types'
import { ArticleBodySkeleton } from './ArticleReaderSkeleton'
import RelatedArticles from './RelatedArticles'

const ArticleBody = lazy(() => import('./ArticleBody'))

type ArticleDocumentProps = {
  article: ArticleSummary
  articleContent: string | null
  contentError: boolean
  articleHeadings: ArticleHeading[]
  activeHeadingId: string | null
  onActiveHeadingChange: (id: string) => void
  shareStatus: 'idle' | 'copied'
  onCopyLink: () => void
  relatedArticles: ArticleSummary[]
  onOpenArticle: (article: ArticleSummary) => void
  onHeadingNavigation: (event: MouseEvent<HTMLAnchorElement>, id: string) => void
}

export default function ArticleDocument({
  article,
  articleContent,
  contentError,
  articleHeadings,
  activeHeadingId,
  onActiveHeadingChange,
  shareStatus,
  onCopyLink,
  relatedArticles,
  onOpenArticle,
  onHeadingNavigation,
}: ArticleDocumentProps) {
  return (
    <>
      <header className="blog-document__header">
        <div>
          <div className="blog-document__index">
            <span className="blog-document__number">01</span>
            <span>READING FILE / 阅读档案</span>
          </div>
          <h2 id="blog-document-title">{article.title}</h2>
        </div>
        <div className="blog-document__header-meta">
          <span className="blog-document__category">{article.category}</span>
          <time dateTime={article.publishedAt}>{article.publishedAt}</time>
          <span>{article.wordCount.toLocaleString('zh-CN')} 字 / {article.tags.join(' / ')}</span>
          <button
            className="blog-share-button"
            type="button"
            aria-label="复制文章链接"
            title="复制文章链接"
            onClick={onCopyLink}
          >
            ↗
          </button>
          <span className="sr-only" aria-live="polite">
            {shareStatus === 'copied' ? '文章链接已复制' : null}
          </span>
        </div>
      </header>

      {contentError ? (
        <p className="blog-hub__error" role="alert">
          文章正文加载失败，请刷新页面重试。
        </p>
      ) : articleContent ? (
        <>
          {/* 目录与正文共用同一个 Suspense 边界：目录必须在正文标题真正挂载后才出现，
              否则用户点击目录链接时 getElementById 还找不到标题节点。 */}
          <Suspense fallback={<ArticleBodySkeleton />}>
            <div className="blog-document__body">
              <ArticleBody
                content={articleContent}
                articleHeadings={articleHeadings}
                onActiveHeadingChange={onActiveHeadingChange}
              />
              {articleHeadings.length > 0 ? (
                <ArticleToc
                  headings={articleHeadings}
                  activeHeadingId={activeHeadingId}
                  onHeadingNavigation={onHeadingNavigation}
                />
              ) : null}
            </div>
          </Suspense>
          <RelatedArticles
            articles={relatedArticles}
            onOpenArticle={onOpenArticle}
          />
        </>
      ) : (
        <ArticleBodySkeleton />
      )}
    </>
  )
}

function ArticleToc({
  headings,
  activeHeadingId,
  onHeadingNavigation,
}: ArticleTocProps) {
  return (
    <aside className="blog-toc" aria-label="文章目录">
      <span className="blog-toc__eyebrow">02 / ON THIS PAGE</span>
      <span className="blog-toc__caption">档案目录</span>
      <nav>
        {headings.map((heading) => (
          <a
            key={heading.id}
            className={`blog-toc__link blog-toc__link--level-${heading.level} ${
              activeHeadingId === heading.id ? 'is-active' : ''
            }`}
            href={`#${heading.id}`}
            onClick={(event) => onHeadingNavigation(event, heading.id)}
            aria-current={
              activeHeadingId === heading.id ? 'location' : undefined
            }
          >
            {heading.text}
          </a>
        ))}
      </nav>
    </aside>
  )
}
