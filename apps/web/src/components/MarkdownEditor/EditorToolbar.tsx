import { Link } from 'react-router-dom'
import ThemeSwitch from '../ThemeSwitch'
import type { EditorMode, EditorSource } from './types'

const MODES: Array<{ value: EditorMode; label: string }> = [
  { value: 'ir', label: '即时渲染' },
  { value: 'wysiwyg', label: '所见即所得' },
  { value: 'sv', label: '分屏预览' },
]

type EditorToolbarProps = {
  mode: EditorMode
  onModeChange: (mode: EditorMode) => void
  fileName: string | null
  isDirty: boolean
  source: EditorSource
  isPublishOpen: boolean
  onNew: () => void
  onOpen: () => void
  onSave: () => void
  onSaveAs: () => void
  onExport: () => void
  onTogglePublish: () => void
  onToggleSidebar: () => void
  onCloseDocument: () => void
}

const getSourceBadge = (source: EditorSource) => {
  if (source.kind === 'note') {
    return { label: '本地笔记', modifier: '' }
  }
  if (source.kind === 'online') {
    return { label: '只读副本', modifier: ' md-badge--warn' }
  }

  return { label: '未绑定文件', modifier: ' md-badge--muted' }
}

export default function EditorToolbar({
  mode,
  onModeChange,
  fileName,
  isDirty,
  source,
  isPublishOpen,
  onNew,
  onOpen,
  onSave,
  onSaveAs,
  onExport,
  onTogglePublish,
  onToggleSidebar,
  onCloseDocument,
}: EditorToolbarProps) {
  const badge = getSourceBadge(source)

  return (
    <header className="md-toolbar">
      <div className="md-toolbar__group md-toolbar__group--file">
        <button
          type="button"
          className="md-icon-button"
          aria-label="切换侧栏"
          onClick={onToggleSidebar}
        >
          ☰
        </button>
        <span className="md-toolbar__file" title={fileName ?? '未命名.md'}>
          {fileName ?? '未命名.md'}
          {isDirty ? (
            <span className="md-toolbar__dirty" aria-label="有未保存的修改">
              ●
            </span>
          ) : null}
        </span>
        <span className={`md-badge${badge.modifier}`}>{badge.label}</span>
      </div>

      <div className="md-toolbar__modes" role="group" aria-label="编辑模式">
        {MODES.map((item) => (
          <button
            key={item.value}
            type="button"
            className={`md-tab${mode === item.value ? ' is-active' : ''}`}
            aria-pressed={mode === item.value}
            onClick={() => onModeChange(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="md-toolbar__group md-toolbar__group--actions">
        <button type="button" className="md-button" onClick={onNew}>
          新建
        </button>
        <button type="button" className="md-button" onClick={onOpen}>
          打开
        </button>
        <button type="button" className="md-button" onClick={onSave}>
          保存
        </button>
        <button type="button" className="md-button" onClick={onSaveAs}>
          另存为
        </button>
        <button type="button" className="md-button" onClick={onExport}>
          导出
        </button>
        <button
          type="button"
          className={`md-button${isPublishOpen ? ' is-active' : ''}`}
          onClick={onTogglePublish}
        >
          发布信息
        </button>
        <button
          type="button"
          className="md-button"
          onClick={onCloseDocument}
        >
          关闭
        </button>
        <ThemeSwitch />
        <Link className="md-link" to="/Home">
          ← 首页
        </Link>
      </div>
    </header>
  )
}
