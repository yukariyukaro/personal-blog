import { BASE_URL } from '../../../utils/baseUrl'
import type { EditorMode, Theme } from '../types'

/**
 * Vditor 运行时按 `${cdn}/dist/...` 拼接资源路径（见其 constants.ts 的
 * CDN 与 THEME_OPTIONS.path），因此复制产物必须保留 dist 层级。
 */
const VENDOR_CDN = `${BASE_URL}vendor/vditor`
const CONTENT_THEME_PATH = `${VENDOR_CDN}/dist/css/content-theme`

const MATH_ICON =
  '<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><path d="M4 18h5l3.5 8L20 6h8" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>'

export type VditorOptionsArgs = {
  mode: EditorMode
  theme: Theme
  value: string
  onInput: (value: string) => void
  onRequestMath: () => void
}

/**
 * 不产出 after：调用方需要先拿到实例引用，再自行拼接 after 回调。
 */
export const createVditorOptions = (args: VditorOptionsArgs): IOptions => {
  const isLight = args.theme === 'light'

  return {
    cdn: VENDOR_CDN,
    height: '100%',
    mode: args.mode,
    theme: isLight ? 'classic' : 'dark',
    icon: 'ant',
    value: args.value,
    cache: { enable: false },
    counter: { enable: true, type: 'markdown' },
    outline: { enable: false, position: 'left' },
    preview: {
      delay: 200,
      theme: { current: isLight ? 'light' : 'dark', path: CONTENT_THEME_PATH },
      hljs: { style: isLight ? 'github' : 'github-dark', lineNumber: true },
      math: { engine: 'KaTeX', inlineDigit: true },
      markdown: {
        toc: true,
        mathBlockPreview: true,
        codeBlockPreview: true,
        sanitize: true,
      },
    },
    toolbar: [
      'headings',
      'bold',
      'italic',
      'strike',
      '|',
      'list',
      'ordered-list',
      'check',
      'outdent',
      'indent',
      '|',
      'quote',
      'line',
      'code',
      'inline-code',
      '|',
      'link',
      'table',
      '|',
      {
        name: 'insertMath',
        tip: '插入公式 (Ctrl/⌘+Alt+M)',
        className: 'vditor-toolbar__icon--math',
        hotkey: '⌘-⌥-m',
        icon: MATH_ICON,
        click: () => args.onRequestMath(),
      },
      '|',
      'undo',
      'redo',
      '|',
      'fullscreen',
    ],
    input: args.onInput,
  }
}

export const VditorContentThemePath = CONTENT_THEME_PATH
