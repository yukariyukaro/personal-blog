import type { MouseEvent, RefObject } from 'react'
import type {
  ArticleFacetStat,
  ArticleIndexStats,
  ArticleSummary,
} from '../../utils/contentApi'

export type ArticleHeading = {
  id: string
  level: 2 | 3
  line: number
  text: string
}

export type ArticleCatalogProps = {
  articles: ArticleSummary[] | null
  categories: ArticleFacetStat[]
  tags: ArticleFacetStat[]
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
  onPrefetchArticle?: (article: ArticleSummary) => void
}

export type ArticleTocProps = {
  headings: ArticleHeading[]
  activeHeadingId: string | null
  onHeadingNavigation: (event: MouseEvent<HTMLAnchorElement>, id: string) => void
}
