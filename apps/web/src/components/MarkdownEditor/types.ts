import type Vditor from 'vditor'
import type { ArticleSummary } from '../../utils/contentApi'
import type { Frontmatter } from './lib/frontmatter'
import type { MathKind } from './lib/mathSnippets'

export type EditorMode = 'ir' | 'wysiwyg' | 'sv'

/** 编辑器内部主题：仅作用于 /Editor 子树，与站点全局样式（唯黑夜主题）无关。 */
export type Theme = 'dark' | 'light'

/**
 * note 只保留相对笔记根目录的路径：根目录句柄已单独持久化，路径比句柄更可靠。
 */
export type EditorSource =
  | { kind: 'note'; path: string[] }
  | { kind: 'online'; slug: string; title: string }
  | { kind: 'untitled' }

export type LauncherView = 'home' | 'online'

export type { NoteDirNode, NoteFileNode, NoteNode } from './lib/fileTree'

export type EditorSessionDeps = {
  readNoteFile: (path: string[]) => Promise<string | null>
  writeNoteFile: (path: string[], text: string) => Promise<boolean>
  readOnlineFile: (summary: ArticleSummary) => Promise<string | null>
  resolveNotePath: (handle: FileSystemFileHandle) => Promise<string[] | null>
  onActiveNoteChange: (path: string[] | null) => void
}

export type ApplyDocumentInput = {
  content: string
  source: EditorSource
  fileName: string | null
  frontmatter: Frontmatter
  mode?: EditorMode
  notice?: string
  /** 关闭文档时传 false，保留上一次草稿以便恢复。 */
  persistDraft?: boolean
}

export type EditorSession = {
  mode: EditorMode
  setMode: (mode: EditorMode) => void
  content: string
  isDirty: boolean
  hasDocument: boolean
  source: EditorSource
  fileName: string | null
  draftSavedAt: number | null
  draftFileName: string | null
  restoredFromDraft: boolean
  frontmatter: Frontmatter
  setFrontmatter: (patch: Partial<Frontmatter>) => void
  frontmatterErrors: string[]
  isMathDialogOpen: boolean
  openMathDialog: () => void
  closeMathDialog: () => void
  insertMath: (latex: string, kind: MathKind) => void
  isPublishOpen: boolean
  togglePublish: () => void
  notice: string | null
  dismissNotice: () => void
  newDocument: () => void
  openNote: (path: string[]) => Promise<void>
  openOnline: (summary: ArticleSummary) => Promise<void>
  openLocal: (text: string, fileName: string, path: string[] | null) => void
  restoreDraft: () => Promise<boolean>
  closeDocument: () => void
  save: () => Promise<void>
  saveAs: () => Promise<void>
  exportMarkdown: () => void
  attachVditor: (instance: Vditor | null) => void
  handleEditorInput: (value: string) => void
}
