import ArticleCard from './ArticleCard'
import type { ArticleCatalogProps } from './types'
export default function ArticleCatalog({
  articles,
  categories,
  tags,
  stats,
  activeCategory,
  activeTag,
  searchQuery,
  searchInputRef,
  visibleArticles,
  onSearchChange,
  onCategoryChange,
  onTagChange,
  onOpenArticle,
}: ArticleCatalogProps) {
  return (
    <main className="blog-main">
      <div className="blog-main__toolbar">
        <div>
          <span className="blog-main__eyebrow">KNOWLEDGE BASE</span>
          <h2>文章与思考</h2>
        </div>
        <label className="blog-search">
          <span className="sr-only">搜索文章</span>
          <span aria-hidden="true">⌕</span>
          <input
            ref={searchInputRef}
            value={searchQuery}
            type="search"
            placeholder="搜索标题、摘要或标签"
            onChange={(event) => onSearchChange(event.target.value)}
          />
          {searchQuery ? (
            <button
              type="button"
              aria-label="清空搜索"
              title="清空搜索"
              onClick={() => onSearchChange('')}
            >
              ×
            </button>
          ) : null}
        </label>
      </div>

      <nav className="blog-categories" aria-label="文章分类">
        <button
          className={`category-btn ${activeCategory === null ? 'is-active' : ''}`}
          type="button"
          onClick={() => onCategoryChange(null)}
        >
          归档
          {stats ? <span className="category-count">{stats.articleCount}</span> : null}
        </button>
        {categories.map((category) => (
          <button
            className={`category-btn ${activeCategory === category.name ? 'is-active' : ''}`}
            type="button"
            key={category.name}
            onClick={() => onCategoryChange(category.name)}
          >
            {category.name}
            <span className="category-count">{category.count}</span>
          </button>
        ))}
      </nav>

      <div className="blog-tag-filters" aria-label="文章标签">
        <span>标签</span>
        <button
          className={activeTag === null ? 'is-active' : ''}
          type="button"
          onClick={() => onTagChange(null)}
        >
          全部
        </button>
        {tags.slice(0, 10).map((tag) => (
          <button
            className={activeTag === tag.name ? 'is-active' : ''}
            type="button"
            key={tag.name}
            onClick={() => onTagChange(tag.name)}
          >
            #{tag.name}
            <small>{tag.count}</small>
          </button>
        ))}
      </div>

      <p className="blog-results-status" aria-live="polite">
        {articles && (searchQuery || activeCategory || activeTag)
          ? `当前显示 ${visibleArticles.length} 篇文章`
          : null}
      </p>

      {visibleArticles.length > 0 ? (
        <div className="blog-article-grid">
          {visibleArticles.map((article) => (
            <ArticleCard key={article.slug} article={article} onOpen={onOpenArticle} />
          ))}
        </div>
      ) : (
        <p className="blog-empty-state">
          {articles && searchQuery && visibleArticles.length === 0
            ? `没有找到包含“${searchQuery}”的文章`
            : '没有匹配的文章'}
        </p>
      )}
    </main>
  )
}
