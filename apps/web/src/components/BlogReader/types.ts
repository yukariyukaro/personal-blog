import type { RefObject } from 'react'
import type { ArticleIndexStats, ArticleSummary } from '../../utils/contentApi'

export type ArticleHeading = {
  id: string
  level: 2 | 3
  line: number
  text: string
}

export type ArticleCatalogProps = {
  articles: ArticleSummary[] | null
  categories: Array<{ name: string; count: number }>
  tags: Array<{ name: string; count: number }>
  stats: ArticleIndexStats | null
  activeCategory: string | null
  activeTag: string | null
  searchQuery: string
  searchInputRef: RefObject<HTMLInputElement | null>
  visibleArticles: ArticleSummary[]
  onSearchChange: (value: string) => void
  onCategoryChange: (category: string | null) => void
  onTagChange: (tag: string | null) => void
  onOpenArticle: (article: ArticleSummary) => void
}
