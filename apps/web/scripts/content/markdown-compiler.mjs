import GithubSlugger from 'github-slugger'
import { toText } from 'hast-util-to-text'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import rehypeKatex from 'rehype-katex'
import rehypePrettyCode from 'rehype-pretty-code'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import rehypeStringify from 'rehype-stringify'
import remarkDirective from 'remark-directive'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import remarkMdx from 'remark-mdx'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import { unified } from 'unified'
import { visit } from 'unist-util-visit'
import remarkControlledMdx from './plugins/remark-controlled-mdx.mjs'

const extraTagNames = [
  'details',
  'summary',
  'figure',
  'figcaption',
  'picture',
  'source',
]

const sanitizeSchema = {
  ...defaultSchema,
  tagNames: [...new Set([...defaultSchema.tagNames, ...extraTagNames])],
  attributes: {
    '*': [
      'className',
      'id',
      'title',
      'dataCalloutType',
      'dataColumns',
      'dataDirective',
      'dataRepo',
    ],
    a: ['className', 'href', 'id', 'title'],
    code: ['className'],
    details: ['className', 'id'],
    figure: ['className', 'id', 'dataColumns', 'dataRepo'],
    img: ['alt', 'className', 'decoding', 'loading', 'src', 'title'],
    input: ['checked', 'className', 'disabled', 'type'],
    li: ['className'],
    ol: ['className', 'start'],
    source: ['className', 'media', 'src', 'srcSet', 'type'],
    summary: ['className', 'id', 'title'],
    table: ['className'],
    tbody: ['className'],
    td: ['align', 'className'],
    th: ['align', 'className'],
    thead: ['className'],
    tr: ['className'],
    ul: ['className'],
  },
  protocols: {
    href: ['http', 'https', 'mailto'],
    src: ['http', 'https'],
  },
}

const wordPattern =
  /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]|[A-Za-z0-9]+(?:[-_'][A-Za-z0-9]+)*/gu

const normalizeVisibleText = (value) => value.replace(/\s+/g, ' ').trim()

const getHeadingText = (node) => {
  if (node.type === 'text') {
    return node.value
  }
  if (node.type === 'element' && node.tagName === 'img') {
    return typeof node.properties?.alt === 'string' ? node.properties.alt : ''
  }
  return Array.isArray(node.children)
    ? node.children.map(getHeadingText).join('')
    : ''
}

const createVisibleTree = (node) => {
  if (
    node.type === 'element' &&
    (node.tagName === 'code' || node.tagName === 'pre')
  ) {
    return undefined
  }
  if (!Array.isArray(node.children)) {
    return { ...node }
  }

  return {
    ...node,
    children: node.children
      .map(createVisibleTree)
      .filter((child) => child !== undefined),
  }
}

const rehypeCollectMetadata = (state) => (tree) => {
  const slugger = new GithubSlugger()

  visit(tree, 'element', (node) => {
    if (!/^h[1-6]$/.test(node.tagName)) return

    const text = normalizeVisibleText(getHeadingText(node))
    if (text === '') return

    const id = slugger.slug(text)
    node.properties ??= {}
    node.properties.id = id

    const level = Number(node.tagName.slice(1))
    if (level === 2 || level === 3) {
      state.headings.push({ id, level, text })
    }
  })

  state.searchText = normalizeVisibleText(toText(createVisibleTree(tree)))
}

const isAllowedUrl = (value, protocols, allowHash) => {
  if (typeof value !== 'string') return false

  const normalized = value.trim()
  if (
    normalized === '' ||
    /[\u0000-\u001f\u007f\\]/.test(normalized) ||
    normalized.startsWith('//')
  ) {
    return false
  }
  if (normalized.startsWith('#')) {
    return allowHash
  }

  const compact = normalized.replace(/\s/g, '')
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(compact)
  return scheme === null || protocols.has(scheme[1].toLowerCase())
}

const rehypeRestrictUrls = () => (tree) => {
  const hrefProtocols = new Set(['http', 'https', 'mailto'])
  const sourceProtocols = new Set(['http', 'https'])

  visit(tree, 'element', (node) => {
    const properties = node.properties
    if (!properties) return

    if (
      node.tagName === 'a' &&
      properties.href !== undefined &&
      !isAllowedUrl(properties.href, hrefProtocols, true)
    ) {
      delete properties.href
    }
    if (
      (node.tagName === 'img' || node.tagName === 'source') &&
      properties.src !== undefined &&
      !isAllowedUrl(properties.src, sourceProtocols, false)
    ) {
      delete properties.src
    }
  })
}

const createProcessor = ({ format, state, article, registry }) => {
  const processor = unified().use(remarkParse)

  if (format === 'mdx') {
    processor.use(remarkMdx)
  }

  return processor
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkDirective)
    .use(remarkControlledMdx, { article, registry })
    .use(remarkRehype)
    .use(rehypeSanitize, sanitizeSchema)
    .use(rehypeCollectMetadata, state)
    .use(rehypeAutolinkHeadings, {
      behavior: 'wrap',
      properties: { className: ['heading-anchor'] },
    })
    .use(rehypeKatex)
    .use(rehypePrettyCode, {
      keepBackground: false,
      theme: 'github-dark',
    })
    .use(rehypeRestrictUrls)
    .use(rehypeStringify)
}

export const compileMarkdown = async ({
  source,
  format,
  article,
  registry,
}) => {
  if (typeof source !== 'string') {
    throw new TypeError('Markdown source must be a string')
  }
  if (format !== 'md' && format !== 'mdx') {
    throw new TypeError('Markdown format must be "md" or "mdx"')
  }

  const state = {
    headings: [],
    searchText: '',
  }
  const file = await createProcessor({
    format,
    state,
    article,
    registry,
  }).process(source)
  const wordCount = state.searchText.match(wordPattern)?.length ?? 0

  return {
    html: String(file),
    headings: state.headings,
    searchText: state.searchText,
    wordCount,
    readingMinutes: Math.max(1, Math.ceil(wordCount / 350)),
    assets: [],
  }
}
