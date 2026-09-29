import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type Vditor from 'vditor'
import {
  createDraftRecord,
  readDraft,
  type DraftRecord,
  writeDraft,
} from '../lib/draftStore'
import {
  downloadMarkdown,
  FALLBACK_FILE_NAME,
  normalizeMarkdownFileName,
  pickSaveTarget,
  writeHandleText,
} from '../lib/fileAccess'
import {
  composeMarkdown,
  createEmptyFrontmatter,
  validateFrontmatter,
} from '../lib/frontmatter'
import type { Frontmatter } from '../lib/frontmatter'
import { buildMathMarkup, type MathKind } from '../lib/mathSnippets'
import type {
  ApplyDocumentInput,
  EditorMode,
  EditorSession,
  EditorSessionDeps,
  EditorSource,
} from '../types'
import { useDocumentOpeners } from './useDocumentOpeners'

const DRAFT_DELAY = 800

export function useEditorSession(deps: EditorSessionDeps): EditorSession {
  const [mode, setModeState] = useState<EditorMode>('ir')
  const [content, setContent] = useState('')
  const [source, setSource] = useState<EditorSource>({ kind: 'untitled' })
  const [fileName, setFileName] = useState<string | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const [hasDocument, setHasDocument] = useState(false)
  const [draftSavedAt, setDraftSavedAt] = useState<number | null>(null)
  const [draftFileName, setDraftFileName] = useState<string | null>(null)
  const [restoredFromDraft, setRestoredFromDraft] = useState(false)
  const [frontmatter, setFrontmatterState] =
    useState<Frontmatter>(createEmptyFrontmatter)
  const [isMathDialogOpen, setIsMathDialogOpen] = useState(false)
  const [isPublishOpen, setIsPublishOpen] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const vditorRef = useRef<Vditor | null>(null)
  const contentRef = useRef('')
  const sourceRef = useRef<EditorSource>({ kind: 'untitled' })
  const fileNameRef = useRef<string | null>(null)
  const modeRef = useRef<EditorMode>('ir')
  const frontmatterRef = useRef<Frontmatter>(frontmatter)
  const dirtyRef = useRef(false)
  const draftTimerRef = useRef<number | null>(null)
  // 关闭文档后内部 refs 会被清空，此时不能再把空内容写回草稿覆盖用户内容。
  const documentOpenRef = useRef(false)
  const pendingContentRef = useRef<string | null>(null)
  const depsRef = useRef(deps)

  useEffect(() => {
    depsRef.current = deps
  }, [deps])

  const persistDraft = useCallback(async () => {
    if (!documentOpenRef.current) {
      return
    }

    const record = createDraftRecord({
      source: sourceRef.current,
      mode: modeRef.current,
      content: contentRef.current,
      fileName: fileNameRef.current,
      frontmatter: frontmatterRef.current,
    })

    if (await writeDraft(record)) {
      setDraftSavedAt(record.updatedAt)
      setDraftFileName(record.fileName)
    }
  }, [])

  const scheduleDraft = useCallback(() => {
    if (draftTimerRef.current !== null) {
      window.clearTimeout(draftTimerRef.current)
    }

    draftTimerRef.current = window.setTimeout(() => {
      draftTimerRef.current = null
      void persistDraft()
    }, DRAFT_DELAY)
  }, [persistDraft])

  const applyContent = useCallback((next: string, nextMode: EditorMode) => {
    const instance = vditorRef.current
    if (instance) {
      instance.setValue(next, true)
      return
    }

    pendingContentRef.current = next
    modeRef.current = nextMode
  }, [])

  const applyDocument = useCallback(
    (next: ApplyDocumentInput) => {
      contentRef.current = next.content
      sourceRef.current = next.source
      fileNameRef.current = next.fileName
      frontmatterRef.current = next.frontmatter
      dirtyRef.current = false
      documentOpenRef.current = next.persistDraft !== false

      setContent(next.content)
      setSource(next.source)
      setFileName(next.fileName)
      setFrontmatterState(next.frontmatter)
      setIsDirty(false)
      setHasDocument(true)
      setNotice(next.notice ?? null)

      if (next.mode !== undefined) {
        modeRef.current = next.mode
        setModeState(next.mode)
      }

      applyContent(next.content, modeRef.current)

      if (next.persistDraft !== false) {
        void persistDraft()
      }
    },
    [applyContent, persistDraft],
  )

  const applyDraftRecord = useCallback(
    (draft: DraftRecord) => {
      const restoredSource: EditorSource =
        draft.sourceKind === 'note' && draft.sourcePath !== null
          ? { kind: 'note', path: draft.sourcePath }
          : draft.sourceKind === 'online' && draft.sourceSlug !== null
            ? {
                kind: 'online',
                slug: draft.sourceSlug,
                title: draft.sourceTitle ?? draft.sourceSlug,
              }
            : { kind: 'untitled' }

      contentRef.current = draft.content
      sourceRef.current = restoredSource
      fileNameRef.current = draft.fileName
      frontmatterRef.current = draft.frontmatter
      modeRef.current = draft.mode
      dirtyRef.current = false
      documentOpenRef.current = true

      setContent(draft.content)
      setSource(restoredSource)
      setFileName(draft.fileName)
      setFrontmatterState(draft.frontmatter)
      setModeState(draft.mode)
      setDraftSavedAt(draft.updatedAt)
      setDraftFileName(draft.fileName)
      setRestoredFromDraft(true)
      setHasDocument(true)
      setNotice('已恢复上次草稿')

      applyContent(draft.content, draft.mode)

      if (restoredSource.kind === 'note') {
        depsRef.current.onActiveNoteChange(restoredSource.path)
      }
    },
    [applyContent],
  )

  const restoreDraft = useCallback(async () => {
    const draft = await readDraft()
    if (!draft) {
      return false
    }

    applyDraftRecord(draft)

    return true
  }, [applyDraftRecord])

  // 首屏自动恢复：可能早于或晚于 Vditor 实例创建，两种情况都要覆盖。
  useEffect(() => {
    let cancelled = false

    const restore = async () => {
      const draft = await readDraft()
      if (!cancelled && draft) {
        applyDraftRecord(draft)
      }
    }

    void restore()

    return () => {
      cancelled = true
    }
  }, [applyDraftRecord])

  useEffect(
    () => () => {
      if (draftTimerRef.current !== null) {
        window.clearTimeout(draftTimerRef.current)
        draftTimerRef.current = null
      }
    },
    [],
  )

  // 切到后台或关闭标签前补写一次，避免防抖窗口内的内容丢失。
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        void persistDraft()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () =>
      document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [persistDraft])

  const setMode = useCallback(
    (next: EditorMode) => {
      modeRef.current = next
      setModeState(next)
      scheduleDraft()
    },
    [scheduleDraft],
  )

  const handleEditorInput = useCallback(
    (value: string) => {
      contentRef.current = value
      setContent(value)

      if (!dirtyRef.current) {
        dirtyRef.current = true
        setIsDirty(true)
      }

      scheduleDraft()
    },
    [scheduleDraft],
  )

  const attachVditor = useCallback((instance: Vditor | null) => {
    vditorRef.current = instance

    if (instance === null) {
      return
    }

    const pending = pendingContentRef.current
    if (pending !== null) {
      pendingContentRef.current = null
      instance.setValue(pending, true)
    }
  }, [])

  const setFrontmatter = useCallback(
    (patch: Partial<Frontmatter>) => {
      const next = { ...frontmatterRef.current, ...patch }
      frontmatterRef.current = next
      setFrontmatterState(next)
      scheduleDraft()
    },
    [scheduleDraft],
  )

  const newDocument = useCallback(() => {
    applyDocument({
      content: '',
      source: { kind: 'untitled' },
      fileName: null,
      frontmatter: createEmptyFrontmatter(),
      notice: '已新建空白文档',
    })
    depsRef.current.onActiveNoteChange(null)
  }, [applyDocument])

  const { openNote, openOnline, openLocal } = useDocumentOpeners(
    depsRef,
    applyDocument,
    setNotice,
  )

  const saveAs = useCallback(async () => {
    const suggested = normalizeMarkdownFileName(
      fileNameRef.current ?? FALLBACK_FILE_NAME,
    )
    const handle = await pickSaveTarget(suggested)

    if (!handle) {
      return
    }

    try {
      await writeHandleText(
        handle,
        composeMarkdown(frontmatterRef.current, contentRef.current),
      )
    } catch {
      setNotice('另存为失败，请重试')

      return
    }

    fileNameRef.current = handle.name
    setFileName(handle.name)
    dirtyRef.current = false
    setIsDirty(false)

    const resolvedPath = await depsRef.current.resolveNotePath(handle)
    if (resolvedPath !== null) {
      sourceRef.current = { kind: 'note', path: resolvedPath }
      setSource(sourceRef.current)
      depsRef.current.onActiveNoteChange(resolvedPath)
    }

    await persistDraft()
    setNotice(`已另存为 ${handle.name}`)
  }, [persistDraft])

  const save = useCallback(async () => {
    const current = sourceRef.current

    if (current.kind !== 'note') {
      await saveAs()
      if (current.kind === 'online') {
        setNotice('线上文章为只读副本，已转为另存为')
      }

      return
    }

    const text = composeMarkdown(frontmatterRef.current, contentRef.current)
    const saved = await depsRef.current.writeNoteFile(current.path, text)

    if (!saved) {
      setNotice('保存失败，请检查笔记目录授权')

      return
    }

    const savedName = current.path.at(-1) ?? fileNameRef.current
    fileNameRef.current = savedName
    setFileName(savedName)
    dirtyRef.current = false
    setIsDirty(false)
    await persistDraft()
    setNotice(`已保存到 ${savedName ?? '文件'}`)
  }, [persistDraft, saveAs])

  const exportMarkdown = useCallback(() => {
    const errors = validateFrontmatter(frontmatterRef.current)
    if (errors.length > 0) {
      setIsPublishOpen(true)
      setNotice(`发布信息不完整：${errors[0] ?? ''}`)

      return
    }

    const targetName =
      fileNameRef.current ?? `${frontmatterRef.current.slug}.md`
    downloadMarkdown(
      targetName,
      composeMarkdown(frontmatterRef.current, contentRef.current),
    )
    setNotice('已导出 Markdown 文件')
  }, [])

  const insertMath = useCallback((latex: string, kind: MathKind) => {
    const instance = vditorRef.current
    if (!instance) {
      return
    }

    instance.insertValue(buildMathMarkup(latex, kind), true)
  }, [])

  const closeDocument = useCallback(() => {
    applyDocument({
      content: '',
      source: { kind: 'untitled' },
      fileName: null,
      frontmatter: createEmptyFrontmatter(),
      persistDraft: false,
    })
    setHasDocument(false)
    setRestoredFromDraft(false)
    depsRef.current.onActiveNoteChange(null)
  }, [applyDocument])

  const openMathDialog = useCallback(() => setIsMathDialogOpen(true), [])
  const closeMathDialog = useCallback(() => setIsMathDialogOpen(false), [])
  const togglePublish = useCallback(() => setIsPublishOpen((open) => !open), [])
  const dismissNotice = useCallback(() => setNotice(null), [])

  const frontmatterErrors = useMemo(
    () => validateFrontmatter(frontmatter),
    [frontmatter],
  )

  return {
    mode,
    setMode,
    content,
    isDirty,
    hasDocument,
    source,
    fileName,
    draftSavedAt,
    draftFileName,
    restoredFromDraft,
    frontmatter,
    setFrontmatter,
    frontmatterErrors,
    isMathDialogOpen,
    openMathDialog,
    closeMathDialog,
    insertMath,
    isPublishOpen,
    togglePublish,
    notice,
    dismissNotice,
    newDocument,
    openNote,
    openOnline,
    openLocal,
    restoreDraft,
    closeDocument,
    save,
    saveAs,
    exportMarkdown,
    attachVditor,
    handleEditorInput,
  }
}
