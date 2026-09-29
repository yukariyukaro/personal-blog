import {
  resolveContentAsset,
  type ArticleSummary,
} from '../../utils/contentApi'
import { resolvePublicAsset } from '../../utils/baseUrl'

/** 列表页与文章页共用的阅读区背景图 */
export const READER_BACKGROUND_IMAGE = resolvePublicAsset(
  'information/background.webp',
)

export const formatNumber = (value: number) =>
  new Intl.NumberFormat('zh-CN').format(value)

export const resolveDisplayImage = (imagePath: string) => {
  if (/^(?:https?:)?\/\//.test(imagePath) || imagePath.startsWith('data:')) {
    return imagePath
  }
  if (imagePath.startsWith('content/')) {
    return resolveContentAsset(imagePath)
  }
  return resolvePublicAsset(imagePath)
}

export const articleSearchText = (article: ArticleSummary) =>
  [article.title, article.summary, article.category, ...article.tags]
    .join(' ')
    .toLocaleLowerCase()

export const filterArticles = (
  articles: ArticleSummary[] | null,
  activeCategory: string | null,
  activeTag: string | null,
  searchQuery: string,
) => {
  const normalizedQuery = searchQuery.trim().toLocaleLowerCase()
  return (articles ?? []).filter((article) => {
    const matchesCategory =
      activeCategory === null || article.category === activeCategory
    const matchesTag = activeTag === null || article.tags.includes(activeTag)
    const matchesSearch =
      normalizedQuery === '' || articleSearchText(article).includes(normalizedQuery)
    return matchesCategory && matchesTag && matchesSearch
  })
}
