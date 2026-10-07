import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import EditorStatusBar from './EditorStatusBar'
import EditorToolbar from './EditorToolbar'
import NoteSidebar from './NoteSidebar'
import PublishPanel from './PublishPanel'
import VditorEditor from './VditorEditor'
import WorkspaceLauncher from './WorkspaceLauncher'
import { useEditorSession } from './hooks/useEditorSession'
import { useLocalImages } from './hooks/useLocalImages'
import { useNoteLibrary } from './hooks/useNoteLibrary'
import { useOnlineArticles } from './hooks/useOnlineArticles'
import { pickMarkdownFile, readHandleText } from './lib/fileAccess'
import type { Theme } from './types'
import './MarkdownEditor.css'

const MathLiveDialog = lazy(() => import('./MathLiveDialog'))

// 编辑器主题是编辑器内部状态，不写 documentElement，避免影响站点其他页面。
const EDITOR_THEME_STORAGE_KEY = 'md-editor-theme'

const readInitialTheme = (): Theme => {
  try {
    return window.localStorage.getItem(EDITOR_THEME_STORAGE_KEY) === 'light'
      ? 'light'
      : 'dark'
  } catch {
    return 'dark'
  }
}

export default function MarkdownEditor() {
  const noteLibrary = useNoteLibrary()
  const onlineArticles = useOnlineArticles()
  const [theme, setTheme] = useState<Theme>(readInitialTheme)
  // 窄屏默认收起侧栏，避免挤压编辑区。
  const [isSidebarOpen, setIsSidebarOpen] = useState(() =>
    window.matchMedia('(min-width: 1180px)').matches,
  )
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  // 编辑区宿主元素：本地图片注入需要观察它的 DOM。
  const editorHostRef = useRef<HTMLDivElement | null>(null)

  const {
    supported,
    rootVersion,
    markActive,
    readNote,
    readImageBlob,
    saveNote,
    createNote,
    resolveNotePath,
  } = noteLibrary
  const { readArticle } = onlineArticles

  const session = useEditorSession({
    readNoteFile: readNote,
    writeNoteFile: saveNote,
    readOnlineFile: readArticle,
    resolveNotePath,
    onActiveNoteChange: markActive,
  })

  const {
    hasDocument,
    mode,
    setMode,
    content,
    isDirty,
    source,
    fileName,
    draftSavedAt,
    draftFileName,
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
  } = session

  // 线上文章 / 未绑定笔记时 dirKey 为 null，此处整体不启用，图片链接保持原样。
  const localImages = useLocalImages({
    source,
    markdown: content,
    hostRef: editorHostRef,
    readImageBlob,
    libraryVersion: rootVersion,
  })

  const toggleTheme = useCallback(() => {
    setTheme((current) => {
      const next = current === 'dark' ? 'light' : 'dark'
      try {
        window.localStorage.setItem(EDITOR_THEME_STORAGE_KEY, next)
      } catch {
        // 隐私模式下 localStorage 可能不可写，主题仅当前会话生效。
      }
      return next
    })
  }, [])

  useEffect(() => {
    document.body.classList.add('md-workspace-active')

    return () => document.body.classList.remove('md-workspace-active')
  }, [])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!event.metaKey && !event.ctrlKey) {
        return
      }

      const key = event.key.toLowerCase()

      if (key === 's') {
        event.preventDefault()
        void (event.shiftKey ? saveAs() : save())

        return
      }

      if (event.altKey && key === 'm') {
        event.preventDefault()
        openMathDialog()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [openMathDialog, save, saveAs])

  const handleOpenFromDisk = useCallback(async () => {
    if (!supported) {
      fileInputRef.current?.click()

      return
    }

    const handle = await pickMarkdownFile()
    if (!handle) {
      return
    }

    const text = await readHandleText(handle)
    openLocal(text, handle.name, await resolveNotePath(handle))
  }, [openLocal, resolveNotePath, supported])

  const handleFileInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      event.target.value = ''

      if (!file) {
        return
      }

      void file.text().then((text) => openLocal(text, file.name, null))
    },
    [openLocal],
  )

  const handleCreateNote = useCallback(async () => {
    const directoryPath = source.kind === 'note' ? source.path.slice(0, -1) : []
    const path = await createNote(directoryPath)

    if (path !== null) {
      await openNote(path)
    }
  }, [createNote, openNote, source])

  return (
    <div
      className={`md-workspace ${
        hasDocument ? 'md-workspace--document' : 'md-workspace--launcher'
      }${isSidebarOpen ? ' is-sidebar-open' : ''}`}
      data-editor-theme={theme}
    >
      {hasDocument ? (
        <>
          <NoteSidebar
            noteLibrary={noteLibrary}
            onlineArticles={onlineArticles}
            onOpenNote={(path) => void openNote(path)}
            onOpenOnline={(summary) => void openOnline(summary)}
            onCreateNote={() => void handleCreateNote()}
            onClose={() => setIsSidebarOpen(false)}
          />

          <div className="md-main">
            <EditorToolbar
              mode={mode}
              onModeChange={setMode}
              fileName={fileName}
              isDirty={isDirty}
              source={source}
              isPublishOpen={isPublishOpen}
              onNew={newDocument}
              onOpen={() => void handleOpenFromDisk()}
              onSave={() => void save()}
              onSaveAs={() => void saveAs()}
              onExport={exportMarkdown}
              onTogglePublish={togglePublish}
              onToggleSidebar={() => setIsSidebarOpen((open) => !open)}
              onCloseDocument={closeDocument}
              theme={theme}
              onToggleTheme={toggleTheme}
            />

            <div className="md-main__body">
              <VditorEditor
                initialValue=""
                mode={mode}
                theme={theme}
                hostRef={editorHostRef}
                onInput={handleEditorInput}
                onInstanceChange={attachVditor}
                onRequestMath={openMathDialog}
              />
            </div>

            <EditorStatusBar
              mode={mode}
              charCount={content.length}
              draftSavedAt={draftSavedAt}
              source={source}
              fileName={fileName}
              resolvedImages={localImages.resolvedCount}
              totalImages={localImages.totalCount}
            />
          </div>
        </>
      ) : (
        <WorkspaceLauncher
          noteLibrary={noteLibrary}
          onlineArticles={onlineArticles}
          draftFileName={draftFileName}
          draftSavedAt={draftSavedAt}
          onRestoreDraft={() => void restoreDraft()}
          onOpenOnline={(summary) => void openOnline(summary)}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
      )}

      {notice !== null ? (
        <div className="md-notice" role="status">
          <span className="md-notice__text">{notice}</span>
          <button
            type="button"
            className="md-icon-button"
            aria-label="关闭提示"
            onClick={dismissNotice}
          >
            ×
          </button>
        </div>
      ) : null}

      {isPublishOpen ? (
        <PublishPanel
          frontmatter={frontmatter}
          errors={frontmatterErrors}
          onChange={setFrontmatter}
          onClose={togglePublish}
          onExport={exportMarkdown}
        />
      ) : null}

      {isMathDialogOpen ? (
        <Suspense fallback={null}>
          <MathLiveDialog onClose={closeMathDialog} onInsert={insertMath} />
        </Suspense>
      ) : null}

      <input
        ref={fileInputRef}
        type="file"
        accept=".md,.markdown,text/markdown"
        hidden
        onChange={handleFileInputChange}
      />
    </div>
  )
}
