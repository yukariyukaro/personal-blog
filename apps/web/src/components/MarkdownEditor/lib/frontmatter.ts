import type { ArticleSummary } from '../../../utils/contentApi'

export type Frontmatter = {
  title: string
  slug: string
  summary: string
  /** YYYY-MM-DD */
  publishedAt: string
  category: string
  tags: string[]
  coverImage?: string
  draft?: boolean
}

export type ParsedFrontmatter = {
  data: Partial<Frontmatter>
  body: string
}

/** 与 scripts/content/article-schema.mjs 保持一致 */
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/
const SCALAR_KEY_PATTERN = /^([A-Za-z][A-Za-z0-9_-]*):(.*)$/
const LIST_ITEM_PATTERN = /^\s+-\s*(.*)$/
const SAFE_SCALAR_PATTERN = /^[A-Za-z0-9\u4e00-\u9fff][^:#\n'"]*$/
const RESERVED_SCALARS = new Set([
  'true',
  'false',
  'null',
  'yes',
  'no',
  'on',
  'off',
])

const FRONTMATTER_BOUNDARY = '---'
const SCALAR_FIELDS = [
  'title',
  'slug',
  'summary',
  'publishedAt',
  'category',
  'coverImage',
] as const

export const toDateString = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

const isValidDate = (value: string) => {
  const match = DATE_PATTERN.exec(value)
  if (!match) {
    return false
  }

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
  const daysByMonth = [
    31,
    leapYear ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ]

  return (
    year > 0 &&
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= (daysByMonth[month - 1] ?? 0)
  )
}

const unquote = (value: string) => {
  if (value.length < 2) {
    return value
  }

  const first = value[0]
  const last = value[value.length - 1]
  if (first === "'" && last === "'") {
    return value.slice(1, -1).replace(/''/g, "'")
  }
  if (first === '"' && last === '"') {
    return value.slice(1, -1)
  }

  return value
}

const serializeScalar = (value: string) => {
  const needsQuote =
    !SAFE_SCALAR_PATTERN.test(value) ||
    DATE_PATTERN.test(value) ||
    RESERVED_SCALARS.has(value.toLowerCase())

  return needsQuote ? `'${value.replace(/'/g, "''")}'` : value
}

const parseBlock = (block: string[]) => {
  const data: Record<string, string | string[]> = {}
  let index = 0

  while (index < block.length) {
    const line = block[index] ?? ''
    index += 1

    if (line.trim() === '' || line.trimStart().startsWith('#')) {
      continue
    }

    const match = SCALAR_KEY_PATTERN.exec(line)
    if (!match) {
      return null
    }

    const key = match[1] ?? ''
    const rawValue = (match[2] ?? '').trim()

    if (rawValue !== '') {
      data[key] = unquote(rawValue)
      continue
    }

    const items: string[] = []
    while (index < block.length) {
      const itemMatch = LIST_ITEM_PATTERN.exec(block[index] ?? '')
      if (!itemMatch) {
        break
      }
      items.push(unquote((itemMatch[1] ?? '').trim()))
      index += 1
    }
    data[key] = items
  }

  return data
}

/**
 * 只认编辑器表单覆盖的字段与简单标量 / 字符串列表结构；
 * 一旦遇到嵌套对象、折叠标量或未知字段，整体回退为纯正文，绝不改写内容。
 */
const toFrontmatter = (
  raw: Record<string, string | string[]>,
): Partial<Frontmatter> | null => {
  const result: Partial<Frontmatter> = {}

  for (const [key, value] of Object.entries(raw)) {
    const isScalarField = (SCALAR_FIELDS as readonly string[]).includes(key)

    if (isScalarField) {
      if (typeof value !== 'string') {
        return null
      }
      result[key as (typeof SCALAR_FIELDS)[number]] = value
      continue
    }

    if (key === 'tags') {
      result.tags =
        typeof value === 'string'
          ? value === ''
            ? []
            : [value]
          : value
      continue
    }

    if (key === 'draft') {
      if (value === 'true') {
        result.draft = true
        continue
      }
      if (value === 'false') {
        continue
      }
      return null
    }

    return null
  }

  return result
}

export const parseFrontmatter = (markdown: string): ParsedFrontmatter => {
  const fallback: ParsedFrontmatter = { data: {}, body: markdown }
  const normalized = markdown.replace(/^\uFEFF/, '')
  const lines = normalized.split(/\r?\n/)

  if ((lines[0] ?? '').trim() !== FRONTMATTER_BOUNDARY) {
    return fallback
  }

  const endIndex = lines.findIndex(
    (line, index) => index > 0 && line.trim() === FRONTMATTER_BOUNDARY,
  )
  if (endIndex === -1) {
    return fallback
  }

  const raw = parseBlock(lines.slice(1, endIndex))
  if (raw === null) {
    return fallback
  }

  const data = toFrontmatter(raw)
  if (data === null) {
    return fallback
  }

  const bodyLines = lines.slice(endIndex + 1)
  while (bodyLines.length > 0 && (bodyLines[0] ?? '').trim() === '') {
    bodyLines.shift()
  }

  return { data, body: bodyLines.join('\n') }
}

export const serializeFrontmatter = (data: Frontmatter): string => {
  const lines: string[] = [FRONTMATTER_BOUNDARY]
  const pushScalar = (key: string, value: string) => {
    const text = value.trim()
    if (text !== '') {
      lines.push(`${key}: ${serializeScalar(text)}`)
    }
  }

  pushScalar('title', data.title)
  pushScalar('slug', data.slug)
  pushScalar('summary', data.summary)
  pushScalar('publishedAt', data.publishedAt)
  pushScalar('category', data.category)

  const tags = data.tags.map((tag) => tag.trim()).filter((tag) => tag !== '')
  if (tags.length > 0) {
    lines.push('tags:')
    for (const tag of tags) {
      lines.push(`  - ${serializeScalar(tag)}`)
    }
  }

  if (data.coverImage !== undefined) {
    pushScalar('coverImage', data.coverImage)
  }
  if (data.draft === true) {
    lines.push('draft: true')
  }

  lines.push(FRONTMATTER_BOUNDARY)

  return lines.join('\n')
}

export const composeMarkdown = (data: Frontmatter, body: string): string =>
  `${serializeFrontmatter(data)}\n\n${body.replace(/^\s*\n/, '')}`

export const createEmptyFrontmatter = (): Frontmatter => ({
  title: '',
  slug: '',
  summary: '',
  publishedAt: toDateString(new Date()),
  category: '',
  tags: [],
})

export const toSlug = (input: string): string => {
  const ascii = input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')

  if (SLUG_PATTERN.test(ascii)) {
    return ascii
  }

  return `post-${toDateString(new Date()).replace(/-/g, '')}`
}

export const validateFrontmatter = (data: Frontmatter): string[] => {
  const errors: string[] = []

  if (data.title.trim() === '') {
    errors.push('标题不能为空')
  }
  if (data.summary.trim() === '') {
    errors.push('摘要不能为空')
  }
  if (data.category.trim() === '') {
    errors.push('分类不能为空')
  }
  if (data.tags.length === 0) {
    errors.push('至少需要一个标签')
  } else if (data.tags.some((tag) => tag.trim() === '')) {
    errors.push('标签不能为空')
  }

  if (data.slug.trim() === '') {
    errors.push('slug 不能为空')
  } else if (!SLUG_PATTERN.test(data.slug.trim())) {
    errors.push('slug 只能包含小写字母、数字与连字符')
  }

  if (data.publishedAt.trim() === '') {
    errors.push('发布日期不能为空')
  } else if (!isValidDate(data.publishedAt.trim())) {
    errors.push('发布日期需为合法的 YYYY-MM-DD')
  }

  return errors
}

/**
 * 线上文章正文在构建期已剥离 frontmatter，这里用索引里的元数据重建。
 */
export const fromArticleSummary = (summary: ArticleSummary): Frontmatter => ({
  title: summary.title,
  slug: summary.slug,
  summary: summary.summary,
  publishedAt: summary.publishedAt,
  category: summary.category,
  tags: [...summary.tags],
  ...(summary.coverImage === undefined
    ? {}
    : { coverImage: summary.coverImage }),
})
