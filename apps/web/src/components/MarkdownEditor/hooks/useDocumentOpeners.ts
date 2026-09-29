import { useCallback } from 'react'
import type { RefObject } from 'react'
import type { ArticleSummary } from '../../../utils/contentApi'
import { FALLBACK_FILE_NAME } from '../lib/fileAccess'
import {
  createEmptyFrontmatter,
  fromArticleSummary,
  parseFrontmatter,
} from '../lib/frontmatter'
import type { ApplyDocumentInput, EditorSessionDeps } from '../types'

export type DocumentOpeners = {
  openNote: (path: string[]) => Promise<void>
  openOnline: (summary: ArticleSummary) => Promise<void>
  openLocal: (text: string, fileName: string, path: string[] | null) => void
}

/**
 * 把三种来源（本地笔记 / 线上文章 / 单文件导入）的文本载入编辑器。
 * 只负责"读取 + 拆出 frontmatter + 交给 applyDocument"，不持有文档状态。
 */
export function useDocumentOpeners(
  depsRef: RefObject<EditorSessionDeps>,
  applyDocument: (input: ApplyDocumentInput) => void,
  setNotice: (notice: string) => void,
): DocumentOpeners {
  const openNote = useCallback(
    async (path: string[]) => {
      const text = await depsRef.current.readNoteFile(path)
      if (text === null) {
        setNotice('无法读取该笔记文件')

        return
      }

      const { data, body } = parseFrontmatter(text)
      applyDocument({
        content: body,
        source: { kind: 'note', path },
        fileName: path.at(-1) ?? FALLBACK_FILE_NAME,
        frontmatter: { ...createEmptyFrontmatter(), ...data },
      })
      depsRef.current.onActiveNoteChange(path)
    },
    [applyDocument, depsRef, setNotice],
  )

  const openOnline = useCallback(
    async (summary: ArticleSummary) => {
      const text = await depsRef.current.readOnlineFile(summary)
      if (text === null) {
        setNotice('无法加载该线上文章')

        return
      }

      const { data, body } = parseFrontmatter(text)
      applyDocument({
        content: body,
        source: { kind: 'online', slug: summary.slug, title: summary.title },
        fileName: `${summary.slug}.md`,
        frontmatter: { ...fromArticleSummary(summary), ...data },
        notice: '线上文章为只读副本，保存将转为另存为',
      })
      depsRef.current.onActiveNoteChange(null)
    },
    [applyDocument, depsRef, setNotice],
  )

  const openLocal = useCallback(
    (text: string, fileName: string, path: string[] | null) => {
      const { data, body } = parseFrontmatter(text)
      applyDocument({
        content: body,
        source: path === null ? { kind: 'untitled' } : { kind: 'note', path },
        fileName,
        frontmatter: { ...createEmptyFrontmatter(), ...data },
        notice:
          path === null
            ? '未绑定笔记目录，保存将转为另存为'
            : `已打开 ${fileName}`,
      })
      depsRef.current.onActiveNoteChange(path)
    },
    [applyDocument, depsRef],
  )

  return { openNote, openOnline, openLocal }
}
