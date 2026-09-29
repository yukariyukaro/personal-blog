/**
 * 本地笔记图片的引用解析（纯函数，无 React / 无 DOM 依赖）。
 *
 * 数据流：extractImageSources → parseImageReference → resolveRelativeSegments
 * 另有一条独立路径 normalizeImageKey，用于把 Markdown 源文本里的引用与渲染后
 * DOM 上的 img[src] 对应起来。
 *
 * 硬约束：本模块只回答"应当读磁盘上的哪个文件"，绝不产出、也不接受任何会被
 * 写回 Markdown 源文本的内容。
 */

export type ImageReference = {
  /** 已解码、已按 '/' 切分的路径片段（可能含 '.' 与 '..'，交给 resolveRelativeSegments 处理） */
  segments: string[]
  /** 路径之后的 query / hash 原文；读盘时忽略，保留以明确解析边界 */
  trailing: string
}

/** Markdown 图片：`![alt](url)`、`![alt](url "title")`、`![alt](<url with space>)`。 */
const MARKDOWN_IMAGE_PATTERN =
  /!\[[^\]]*\]\(\s*(?:<([^>]+)>|([^)\s]+))(?:\s+["'][^"']*["'])?\s*\)/g
const HTML_IMAGE_PATTERN = /<img\b[^>]*?\ssrc\s*=\s*["']([^"']+)["'][^>]*>/gi

/** 首个 '?' 或 '#' 之后视为 query/hash，不属于文件路径。 */
const TRAILING_PATTERN = /[?#]/

const PROTOCOL_RELATIVE = /^(?:[a-z][a-z0-9+.-]*:)?\/\//i
const ANY_SCHEME = /^[a-z][a-z0-9+.-]*:/i

/**
 * 判定「非本地源」：外链 / 协议相对 / 站内绝对路径 / data: / blob: / file: / 纯锚点。
 *
 * 这是防止误伤 CDN 与站内图片的统一闸门，提取与 DOM 写入前都会调用。
 * 判定顺序不可颠倒（`//cdn/a.png` 必须命中协议相对，而不是漏判）。
 */
export const isNonLocalSource = (src: string): boolean => {
  const value = src.trim()

  if (value === '') return true
  if (value.startsWith('/')) return true // 站内绝对路径，语义指向 public/
  if (value.startsWith('#')) return true // 纯锚点，不是图片
  if (PROTOCOL_RELATIVE.test(value)) return true
  if (ANY_SCHEME.test(value)) return true

  return false
}

const decodeSafely = (value: string) => {
  try {
    return decodeURIComponent(value)
  } catch {
    return value // 含非法 % 序列时按原文处理
  }
}

const collectMatches = (text: string, pattern: RegExp): string[] => {
  const matches: string[] = []

  for (const match of text.matchAll(new RegExp(pattern.source, pattern.flags))) {
    // Markdown 模式有两个互斥分支（尖括号包裹 / 普通），HTML 模式只有一个。
    const value = match[1] ?? match[2]
    if (value) {
      matches.push(value)
    }
  }

  return matches
}

/** 抽取文本中所有图片引用原文（Markdown `![]()` 与 HTML `<img src>` 两种写法，顺序不保证） */
export const extractImageSources = (markdown: string): string[] => [
  ...collectMatches(markdown, MARKDOWN_IMAGE_PATTERN),
  ...collectMatches(markdown, HTML_IMAGE_PATTERN),
]

/**
 * 解析单个引用；返回 null 表示「不是可处理的本地相对路径」。
 * 外链、站内绝对路径、data:/blob: 等在这里被拦掉，因此调用方拿到的都已是本地引用。
 */
export const parseImageReference = (src: string): ImageReference | null => {
  if (isNonLocalSource(src)) return null

  const trimmed = src.trim()
  const trailingIndex = trimmed.search(TRAILING_PATTERN)
  const pathPart = trailingIndex === -1 ? trimmed : trimmed.slice(0, trailingIndex)
  const trailing = trailingIndex === -1 ? '' : trimmed.slice(trailingIndex)

  const segments = decodeSafely(pathPart)
    .replace(/\\/g, '/')
    .split('/')
    .filter((segment) => segment !== '')

  if (segments.length === 0) return null

  return { segments, trailing }
}

/**
 * 以笔记所在目录为基准解析相对路径。
 * 越出授权根（`..` 弹栈时栈已空）返回 null —— File System Access 无法向上遍历。
 */
export const resolveRelativeSegments = (
  baseDirPath: string[],
  imageSegments: string[],
): string[] | null => {
  const stack = [...baseDirPath]

  for (const segment of imageSegments) {
    if (segment === '.' || segment === '') continue

    if (segment === '..') {
      if (stack.length === 0) return null
      stack.pop()
      continue
    }

    stack.push(segment)
  }

  return stack.length === 0 ? null : stack
}

/**
 * DOM 匹配用的规范化 key：trim → 去 query/hash → 容错解码 percent →
 * 反斜杠转正斜杠 → 折叠重复斜杠 → 去前导 './'。
 *
 * 刻意**不抹除前导 '/'**：绝对路径已被 isNonLocalSource 挡在外面，此处再加工会
 * 让 `/images/a.png` 与本地 `images/a.png` 撞键，进而劫持站内图片。
 */
export const normalizeImageKey = (src: string): string => {
  const trimmed = src.trim()
  const trailingIndex = trimmed.search(TRAILING_PATTERN)
  const withoutTrailing =
    trailingIndex === -1 ? trimmed : trimmed.slice(0, trailingIndex)

  return decodeSafely(withoutTrailing)
    .replace(/\\/g, '/')
    .replace(/\/{2,}/g, '/')
    .replace(/^(?:\.\/)+/, '')
}
