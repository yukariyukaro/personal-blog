import type { MouseEvent } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { ArticleSummary } from '../../utils/contentApi'
import { resolveDisplayImage } from './contentUtils'
import RelatedArticles from './RelatedArticles'
import type { ArticleHeading } from './types'

type ArticleDocumentProps = {
  selectedArticle: ArticleSummary | null
  articleContent: string | null
  contentError: boolean
  articleHeadings: ArticleHeading[]
  activeHeadingId: string | null
  shareStatus: 'idle' | 'copied'
  onCopyLink: () => void
  relatedArticles: ArticleSummary[]
  onOpenArticle: (article: ArticleSummary) => void
  onHeadingNavigation: (event: MouseEvent<HTMLAnchorElement>, id: string) => void
}

export default function ArticleDocument({
  selectedArticle,
  articleContent,
  contentError,
  articleHeadings,
  activeHeadingId,
  shareStatus,
  onCopyLink,
  relatedArticles,
  onOpenArticle,
  onHeadingNavigation,
}: ArticleDocumentProps) {
  if (!selectedArticle) {
    return null
  }

  return (
    <>
      <header className="blog-document__header">
        <div>
          <span>READING</span>
          <h2 id="blog-document-title">{selectedArticle.title}</h2>
        </div>
        <div className="blog-document__header-meta">
          <time dateTime={selectedArticle.publishedAt}>
            {selectedArticle.publishedAt}
          </time>
          <span>{selectedArticle.tags.join(' / ')}</span>
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
          文章正文加载失败，请选择其他文章或刷新页面。
        </p>
      ) : articleContent ? (
        <>
          <div className="blog-document__body">
            <MarkdownArticle
              content={articleContent}
              articleHeadings={articleHeadings}
            />
            {articleHeadings.length > 0 ? (
              <ArticleToc
                headings={articleHeadings}
                activeHeadingId={activeHeadingId}
                onHeadingNavigation={onHeadingNavigation}
              />
            ) : null}
          </div>
          <RelatedArticles
            articles={relatedArticles}
            onOpenArticle={onOpenArticle}
          />
        </>
      ) : (
        <div className="blog-document__skeleton" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      )}
    </>
  )
}

function MarkdownArticle({
  content,
  articleHeadings,
}: {
  content: string
  articleHeadings: ArticleHeading[]
}) {
  const headingsByLine = new Map(
    articleHeadings.map((heading) => [heading.line, heading]),
  )

  return (
    <article className="markdown-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h2: ({ children, node }) => {
            const heading = headingsByLine.get(node?.position?.start.line ?? 0)
            return (
              <h2 id={heading?.id} data-article-heading>
                {children}
              </h2>
            )
          },
          h3: ({ children, node }) => {
            const heading = headingsByLine.get(node?.position?.start.line ?? 0)
            return (
              <h3 id={heading?.id} data-article-heading>
                {children}
              </h3>
            )
          },
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
              decoding="async"
            />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </article>
  )
}

function ArticleToc({
  headings,
  activeHeadingId,
  onHeadingNavigation,
}: {
  headings: ArticleHeading[]
  activeHeadingId: string | null
  onHeadingNavigation: (event: MouseEvent<HTMLAnchorElement>, id: string) => void
}) {
  return (
    <aside className="blog-toc" aria-label="文章目录">
      <span className="blog-toc__eyebrow">ON THIS PAGE</span>
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
