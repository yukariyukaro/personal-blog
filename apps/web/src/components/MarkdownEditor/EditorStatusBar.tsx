import type { EditorMode, EditorSource } from './types'

const MODE_LABELS: Record<EditorMode, string> = {
  ir: '即时渲染',
  wysiwyg: '所见即所得',
  sv: '分屏预览',
}

type EditorStatusBarProps = {
  mode: EditorMode
  charCount: number
  draftSavedAt: number | null
  source: EditorSource
  fileName: string | null
  /** 本地图片已解析数；配合 totalImages 使用。 */
  resolvedImages?: number
  /** 本地相对图片引用数（不含外链 / 站内绝对路径）；为 0 时整项不渲染。 */
  totalImages?: number
}

export default function EditorStatusBar({
  mode,
  charCount,
  draftSavedAt,
  source,
  fileName,
  resolvedImages = 0,
  totalImages = 0,
}: EditorStatusBarProps) {
  const sourceLabel =
    source.kind === 'note'
      ? source.path.join(' / ')
      : source.kind === 'online'
        ? `线上：${source.title}`
        : '未绑定本地文件'

  const draftLabel =
    draftSavedAt === null
      ? '尚未写入草稿'
      : `已存草稿 ${new Date(draftSavedAt).toLocaleTimeString('zh-CN', {
          hour12: false,
        })}`

  return (
    <footer className="md-status-bar">
      <span className="md-status-bar__item">{MODE_LABELS[mode]}</span>
      <span className="md-status-bar__item">
        {charCount.toLocaleString('zh-CN')} 字
      </span>
      <span className="md-status-bar__item">{draftLabel}</span>
      {totalImages > 0 ? (
        <span
          className={`md-status-bar__item${
            resolvedImages < totalImages ? ' md-status-bar__item--warn' : ''
          }`}
          title="本地相对路径图片；未解析成功的通常是文件缺失或超出已授权目录"
        >
          图片 {resolvedImages}/{totalImages}
        </span>
      ) : null}
      <span
        className="md-status-bar__item md-status-bar__item--path"
        title={`${fileName ?? '未命名.md'} · ${sourceLabel}`}
      >
        {fileName ?? '未命名.md'} · {sourceLabel}
      </span>
    </footer>
  )
}
