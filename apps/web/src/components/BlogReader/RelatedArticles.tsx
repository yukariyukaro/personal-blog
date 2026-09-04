import type { ArticleSummary } from '../../utils/contentApi'
import { formatNumber } from './contentUtils'

type RelatedArticlesProps = {
  articles: ArticleSummary[]
  onOpenArticle: (article: ArticleSummary) => void
}

export default function RelatedArticles({
  articles,
  onOpenArticle,
}: RelatedArticlesProps) {
  if (articles.length === 0) {
    return null
  }

  return (
    <section className="related-articles" aria-labelledby="related-articles-title">
      <div className="related-articles__heading">
        <span className="blog-toc__eyebrow">KEEP EXPLORING</span>
        <h3 id="related-articles-title">继续阅读</h3>
      </div>
      <div className="related-articles__list">
        {articles.map((article) => (
          <button
            className="related-article"
            type="button"
            key={article.slug}
            onClick={() => onOpenArticle(article)}
          >
            <span className="related-article__category">{article.category}</span>
            <strong>{article.title}</strong>
            <span className="related-article__meta">
              {article.publishedAt} · {formatNumber(article.wordCount)} 字
            </span>
            <span className="related-article__arrow" aria-hidden="true">→</span>
          </button>
        ))}
      </div>
    </section>
  )
}
