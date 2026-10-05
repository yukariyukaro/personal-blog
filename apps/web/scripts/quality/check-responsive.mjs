import { readdir, readFile } from 'node:fs/promises'
import { extname, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

/** 主干断点：新代码只允许使用这三个宽度值（与 playwright 三档视口对齐） */
export const PRIMARY_BREAKPOINTS = new Set([768, 1024, 1440])

/** 历史遗留断点：只允许出现在下列文件中，禁止扩散到其它文件 */
export const LEGACY_BREAKPOINTS = new Map([
  [
    1180,
    new Set([
      'src/components/MarkdownEditor/MarkdownEditorLayout.css',
      'src/components/MarkdownEditor/index.tsx',
    ]),
  ],
  [
    1200,
    new Set(['src/components/HomePanels/DetailPanel/DetailPanelCard.css']),
  ],
])

/** width / min-width 的固定像素上限，超过该值视为移动端横向溢出风险 */
export const MAX_FIXED_WIDTH_PX = 480

const SOURCE_DIRECTORIES = ['src']
const EXTRA_STYLE_FILES = ['index.html']
const SCRIPT_EXTENSIONS = new Set(['.ts', '.tsx'])
const IGNORED_DIRECTORY_NAMES = new Set(['node_modules', 'dist', 'output'])

const RULE_HINTS = {
  breakpoint: '只允许使用主干断点 768 / 1024 / 1440px，详见 .trae/rules/responsive-design.md',
  fontSize: '字号请使用 rem 或 clamp()，不要写死 px',
  fixedWidth: `width / min-width 请使用 % / vw / min() / max()，固定 px 不要超过 ${MAX_FIXED_WIDTH_PX}px`,
  inlineSize: '内联样式请避免写死 px 尺寸，改用 CSS 类 + 弹性单位',
}

const SCRIPT_BREAKPOINT_PATTERNS = [
  /innerWidth\s*(?:<=|>=|<|>)\s*(\d+)/g,
  /innerHeight\s*(?:<=|>=|<|>)\s*(\d+)/g,
  /matchMedia\(\s*[`'"](?:min|max)-width:\s*(\d+)px/g,
  /[A-Za-z_$][\w$]*BREAKPOINT[\w$]*\s*=\s*(\d+)/g,
]

const FONT_SIZE_PATTERN = /font-size\s*:\s*[^;{}]*?(\d+(?:\.\d+)?)px/g

const FIXED_WIDTH_PATTERN = /(?:^|[;{\s])(width|min-width)\s*:\s*([^;{}]*?)(\d+(?:\.\d+)?)px/g

const INLINE_SIZE_PATTERN =
  /\b(width|minWidth|maxWidth|height|minHeight|maxHeight)\s*:\s*[`'"](\d+(?:\.\d+)?)px[`'"]/g

const toPortablePath = (path) => path.split(sep).join('/')

const lineOf = (source, index) => source.slice(0, index).split('\n').length

const stripCssComments = (source) =>
  source.replace(/\/\*[\s\S]*?\*\//g, (match) => match.replace(/[^\n]/g, ' '))

const collectFiles = async (root, directory) => {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const path = resolve(directory, entry.name)

    if (entry.isDirectory()) {
      if (!IGNORED_DIRECTORY_NAMES.has(entry.name)) {
        files.push(...(await collectFiles(root, path)))
      }
    } else if (entry.isFile()) {
      const extension = extname(entry.name)
      if (
        extension === '.css' ||
        extension === '.html' ||
        SCRIPT_EXTENSIONS.has(extension)
      ) {
        files.push(path)
      }
    }
  }

  return files
}

const isAllowedBreakpoint = (value, relativePath) => {
  if (PRIMARY_BREAKPOINTS.has(value)) return true
  return LEGACY_BREAKPOINTS.get(value)?.has(relativePath) ?? false
}

const collectMediaQueryBreakpoints = (source) => {
  const findings = []
  const pattern = /@media([^{]*)\{/g

  for (const match of source.matchAll(pattern)) {
    const prelude = match[1]
    if (!prelude.includes('width')) continue

    for (const size of prelude.matchAll(/(\d+(?:\.\d+)?)px/g)) {
      findings.push({
        value: Number(size[1]),
        line: lineOf(source, match.index + match[0].indexOf(size[0])),
        snippet: `@media${prelude.trim()}`,
      })
    }
  }

  return findings
}

const collectScriptBreakpoints = (source) => {
  const findings = []

  for (const pattern of SCRIPT_BREAKPOINT_PATTERNS) {
    for (const match of source.matchAll(pattern)) {
      findings.push({
        value: Number(match[1]),
        line: lineOf(source, match.index),
        snippet: match[0].replace(/\s+/g, ' ').trim(),
      })
    }
  }

  return findings
}

const collectStyleViolations = (relativePath, source) => {
  const violations = []
  const stripped = stripCssComments(source)

  for (const finding of collectMediaQueryBreakpoints(stripped)) {
    if (!isAllowedBreakpoint(finding.value, relativePath)) {
      violations.push({
        path: relativePath,
        line: finding.line,
        message: `出现非主干断点 ${finding.value}px（${finding.snippet}）：${RULE_HINTS.breakpoint}`,
      })
    }
  }

  for (const match of stripped.matchAll(FONT_SIZE_PATTERN)) {
    violations.push({
      path: relativePath,
      line: lineOf(stripped, match.index),
      message: `font-size 使用了固定像素 ${match[1]}px：${RULE_HINTS.fontSize}`,
    })
  }

  for (const match of stripped.matchAll(FIXED_WIDTH_PATTERN)) {
    if (Number(match[3]) < MAX_FIXED_WIDTH_PX) continue

    violations.push({
      path: relativePath,
      line: lineOf(stripped, match.index),
      message: `${match[1]} 固定为 ${match[3]}px：${RULE_HINTS.fixedWidth}`,
    })
  }

  return violations
}

const collectScriptViolations = (relativePath, source) => {
  const violations = []

  for (const finding of collectScriptBreakpoints(source)) {
    if (!isAllowedBreakpoint(finding.value, relativePath)) {
      violations.push({
        path: relativePath,
        line: finding.line,
        message: `JS 侧出现非主干断点 ${finding.value}px（${finding.snippet}）：${RULE_HINTS.breakpoint}`,
      })
    }
  }

  for (const match of source.matchAll(INLINE_SIZE_PATTERN)) {
    violations.push({
      path: relativePath,
      line: lineOf(source, match.index),
      message: `内联样式写死了 ${match[1]}: '${match[2]}px'：${RULE_HINTS.inlineSize}`,
    })
  }

  return violations
}

export const findResponsiveViolations = async (root) => {
  const absoluteRoot = resolve(root)
  const files = [
    ...(await Promise.all(
      SOURCE_DIRECTORIES.map((directory) =>
        collectFiles(absoluteRoot, resolve(absoluteRoot, directory)),
      ),
    )).flat(),
    ...EXTRA_STYLE_FILES.map((file) => resolve(absoluteRoot, file)),
  ]

  const violations = []

  for (const path of files) {
    let source

    try {
      source = await readFile(path, 'utf8')
    } catch {
      continue
    }

    const relativePath = toPortablePath(relative(absoluteRoot, path))

    if (SCRIPT_EXTENSIONS.has(extname(path))) {
      violations.push(...collectScriptViolations(relativePath, source))
    } else {
      violations.push(...collectStyleViolations(relativePath, source))
    }
  }

  return violations.sort(
    (left, right) =>
      left.path.localeCompare(right.path) || left.line - right.line,
  )
}

const scriptPath = fileURLToPath(import.meta.url)
const isCli = process.argv[1] && resolve(process.argv[1]) === scriptPath

if (isCli) {
  const appRoot =
    process.argv[2] ?? fileURLToPath(new URL('../..', import.meta.url))
  const violations = await findResponsiveViolations(appRoot)

  for (const violation of violations) {
    console.error(`${violation.path}:${violation.line}: ${violation.message}`)
  }

  if (violations.length > 0) {
    process.exitCode = 1
  }
}
