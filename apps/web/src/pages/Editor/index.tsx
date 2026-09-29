import { lazy, Suspense } from 'react'

const MarkdownEditor = lazy(() => import('../../components/MarkdownEditor'))

export default function EditorPage() {
  return (
    <Suspense
      fallback={
        <div className="markdown-editor-loading" aria-label="编辑器加载中" />
      }
    >
      <MarkdownEditor />
    </Suspense>
  )
}
