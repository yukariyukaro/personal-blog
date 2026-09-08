import type { ReactNode } from 'react'
import {
  resolveContentAsset,
  type ArticleSummary,
} from '../../utils/contentApi'
import { resolvePublicAsset } from '../../utils/baseUrl'
import type { ArticleHeading } from './types'

export const formatNumber = (value: number) =>
  new Intl.NumberFormat('zh-CN').format(value)

export const getHeadingText = (value: ReactNode): string => {
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value)
  }
  if (Array.isArray(value)) {
    return value.map(getHeadingText).join('')
  }
  if (value && typeof value === 'object' && 'props' in value) {
    const props = (value as { props?: { children?: ReactNode } }).props
    return getHeadingText(props?.children)
  }
  return ''
}

const slugifyHeading = (text: string, index: number) => {
  const slug = text
    .trim()
    .toLocaleLowerCase()
    .replace(/[`*_~[\]{}]/g, '')
    .replace(
      /[^\p{Letter}\p{Number}\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]+/gu,
      '-',
    )
    .replace(/^-+|-+$/g, '')

  return slug || `section-${index + 1}`
}

export const extractHeadings = (content: string): ArticleHeading[] => {
  const usedIds = new Map<string, number>()
  const headings: ArticleHeading[] = []
  const pattern = /^(#{2,3})\s+(.+?)\s*#*\s*$/gm
  let match: RegExpExecArray | null

  while ((match = pattern.exec(content))) {
    const level = match[1].length as 2 | 3
    const text = match[2].trim()
    const baseId = slugifyHeading(text, headings.length)
    const occurrence = usedIds.get(baseId) ?? 0
    usedIds.set(baseId, occurrence + 1)
    headings.push({
      id: occurrence === 0 ? baseId : `${baseId}-${occurrence + 1}`,
      level,
      line: content.slice(0, match.index).split('\n').length,
      text,
    })
  }

  return headings
}

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
