import { memo } from 'react'
import type { KeyboardEvent } from 'react'
import type { ArticleSummary } from '../../utils/contentApi'
import { formatNumber, resolveDisplayImage } from './contentUtils'

type ArticleCardProps = {
  article: ArticleSummary
  onOpen: (article: ArticleSummary) => void
}

const ArticleCard = memo(function ArticleCard({
  article,
  onOpen,
}: ArticleCardProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onOpen(article)
    }
  }

  return (
    <article
      className="featured-article"
      tabIndex={0}
      role="button"
      onClick={() => onOpen(article)}
      onKeyDown={handleKeyDown}
    >
      {article.coverImage ? (
        <div className="featured-article__cover">
          <img
            src={resolveDisplayImage(article.coverImage)}
            alt={article.title}
            loading="lazy"
            decoding="async"
          />
        </div>
      ) : null}
      <div className="featured-article__content">
        <h2 className="featured-article__title">{article.title}</h2>
        <div className="featured-article__tags">
          <span className="tag-pill tag-pill--primary">{article.category}</span>
          {article.tags.map((tag) => (
            <span className="tag-pill" key={tag}>
              # {tag}
            </span>
          ))}
        </div>
        <p className="featured-article__summary">{article.summary}</p>
        <div className="featured-article__meta">
          <span>{article.publishedAt}</span>
          <span>{formatNumber(article.wordCount)} 字</span>
          <span>{article.readingMinutes} 分钟</span>
        </div>
      </div>
    </article>
  )
})

export default ArticleCard
