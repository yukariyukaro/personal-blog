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
}

export type BlogReaderViewModel = {
  articleSectionRef: RefObject<HTMLElement | null>
  searchInputRef: RefObject<HTMLInputElement | null>
  readerBackgroundImage: string
  articles: ArticleSummary[] | null
  visibleArticles: ArticleSummary[]
  selectedArticle: ArticleSummary | null
  spotlightArticle: ArticleSummary | null
  articleContent: string | null
  relatedArticles: ArticleSummary[]
  categories: ArticleFacetStat[]
  tags: ArticleFacetStat[]
  stats: ArticleIndexStats | null
  articleHeadings: ArticleHeading[]
  activeHeadingId: string | null
  activeCategory: string | null
  activeTag: string | null
  searchQuery: string
  indexError: boolean
  contentError: boolean
  shareStatus: 'idle' | 'copied'
  copyStatus: 'idle' | 'copied'
  now: Date
  openArticle: (article: ArticleSummary) => void
  setActiveCategory: (value: string | null) => void
  setActiveTag: (value: string | null) => void
  setSearchQuery: (value: string) => void
  focusSearch: () => void
  copyEmail: () => void
  copyArticleLink: () => void
  navigateToHeading: (
    event: MouseEvent<HTMLAnchorElement>,
    id: string,
  ) => void
}
