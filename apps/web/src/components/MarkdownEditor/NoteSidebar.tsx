import { useMemo, useState } from 'react'
import type { ArticleSummary } from '../../utils/contentApi'
import type { NoteLibrary } from './hooks/useNoteLibrary'
import type { OnlineArticles } from './hooks/useOnlineArticles'
import type { NoteNode } from './lib/fileTree'
import { relativeKey } from './lib/fileTree'

type NoteSidebarProps = {
  noteLibrary: NoteLibrary
  onlineArticles: OnlineArticles
  onOpenNote: (path: string[]) => void
  onOpenOnline: (summary: ArticleSummary) => void
  onCreateNote: () => void
  onClose: () => void
}

type SidebarTab = 'notes' | 'online'

type TreeListProps = {
  nodes: NoteNode[]
  depth: number
  collapsed: Set<string>
  activeKey: string | null
  onToggle: (key: string) => void
  onOpenNote: (path: string[]) => void
}

const matches = (value: string, keyword: string) =>
  value.toLowerCase().includes(keyword)

const filterNodes = (nodes: NoteNode[], keyword: string): NoteNode[] => {
  if (keyword === '') {
    return nodes
  }

  const result: NoteNode[] = []

  for (const node of nodes) {
    if (node.kind === 'file') {
      if (matches(node.name, keyword)) {
        result.push(node)
      }
      continue
    }

    const children = filterNodes(node.children, keyword)
    if (children.length > 0) {
      result.push({ ...node, children })
    } else if (matches(node.name, keyword)) {
      result.push(node)
    }
  }

  return result
}

function TreeList({
  nodes,
  depth,
  collapsed,
  activeKey,
  onToggle,
  onOpenNote,
}: TreeListProps) {
  return (
    <ul className="md-tree">
      {nodes.map((node) => {
        const key = relativeKey(node.path)
        const indent = { paddingLeft: `${0.6 + depth * 0.85}rem` }

        if (node.kind === 'dir') {
          const isCollapsed = collapsed.has(key)

          return (
            <li key={key}>
              <button
                type="button"
                className="md-tree__dir"
                style={indent}
                aria-expanded={!isCollapsed}
                onClick={() => onToggle(key)}
              >
                <span className="md-tree__caret" aria-hidden="true">
                  {isCollapsed ? '▸' : '▾'}
                </span>
                <span className="md-tree__name">{node.name}</span>
              </button>
              {isCollapsed ? null : (
                <TreeList
                  nodes={node.children}
                  depth={depth + 1}
                  collapsed={collapsed}
                  activeKey={activeKey}
                  onToggle={onToggle}
                  onOpenNote={onOpenNote}
                />
              )}
            </li>
          )
        }

        return (
          <li key={key}>
            <button
              type="button"
              className={`md-tree__file${key === activeKey ? ' is-active' : ''}`}
              style={indent}
              title={node.path.join('/')}
              onClick={() => onOpenNote(node.path)}
            >
              {node.name}
            </button>
          </li>
        )
      })}
    </ul>
  )
}

export default function NoteSidebar({
  noteLibrary,
  onlineArticles,
  onOpenNote,
  onOpenOnline,
  onCreateNote,
  onClose,
}: NoteSidebarProps) {
  const [tab, setTab] = useState<SidebarTab>(
    noteLibrary.rootName === null ? 'online' : 'notes',
  )
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set())
  const [noteQuery, setNoteQuery] = useState('')

  const filteredTree = useMemo(
    () => filterNodes(noteLibrary.tree, noteQuery.trim().toLowerCase()),
    [noteLibrary.tree, noteQuery],
  )

  const toggleNode = (key: string) => {
    setCollapsed((current) => {
      const next = new Set(current)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }

      return next
    })
  }

  return (
    <aside className="md-sidebar" aria-label="笔记导航">
      <div className="md-sidebar__tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'notes'}
          className={`md-tab${tab === 'notes' ? ' is-active' : ''}`}
          onClick={() => setTab('notes')}
        >
          笔记库
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'online'}
          className={`md-tab${tab === 'online' ? ' is-active' : ''}`}
          onClick={() => setTab('online')}
        >
          线上文章
        </button>
        <button
          type="button"
          className="md-icon-button md-sidebar__close"
          aria-label="收起侧栏"
          onClick={onClose}
        >
          ×
        </button>
      </div>

      <label className="md-search md-search--compact">
        <span aria-hidden="true">⌕</span>
        <input
          value={tab === 'notes' ? noteQuery : onlineArticles.query}
          placeholder={tab === 'notes' ? '搜索笔记文件名' : '搜索标题 / 摘要 / 标签'}
          onChange={(event) => {
            if (tab === 'notes') {
              setNoteQuery(event.target.value)
            } else {
              onlineArticles.setQuery(event.target.value)
            }
          }}
        />
      </label>

      <div className="md-sidebar__body">
        {tab === 'notes' ? (
          <>
            {noteLibrary.rootName === null ? (
              <p className="md-sidebar__empty">
                还没有绑定笔记文件夹。
                <button
                  type="button"
                  className="md-link-button"
                  onClick={() => void noteLibrary.connect()}
                >
                  立即选择
                </button>
              </p>
            ) : noteLibrary.isScanning ? (
              <p className="md-sidebar__empty">正在读取目录…</p>
            ) : filteredTree.length === 0 ? (
              <p className="md-sidebar__empty">
                {noteQuery.trim() === ''
                  ? '该目录下没有 Markdown 文件。'
                  : '没有匹配的文件。'}
              </p>
            ) : (
              <TreeList
                nodes={filteredTree}
                depth={0}
                collapsed={collapsed}
                activeKey={noteLibrary.activeKey}
                onToggle={toggleNode}
                onOpenNote={onOpenNote}
              />
            )}
            {noteLibrary.truncated ? (
              <p className="md-sidebar__hint">目录过大，已按上限截断显示。</p>
            ) : null}
          </>
        ) : onlineArticles.isLoading ? (
          <p className="md-sidebar__empty">正在加载文章索引…</p>
        ) : onlineArticles.error !== null ? (
          <p className="md-sidebar__empty">{onlineArticles.error}</p>
        ) : (
          <ul className="md-online-list">
            {onlineArticles.visibleArticles.map((article) => (
              <li key={article.slug}>
                <button
                  type="button"
                  className="md-online-item"
                  onClick={() => onOpenOnline(article)}
                >
                  <span className="md-online-item__title">{article.title}</span>
                  <span className="md-online-item__meta">
                    {article.publishedAt} · {article.category}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {tab === 'notes' ? (
        <footer className="md-sidebar__footer">
          <button
            type="button"
            className="md-button md-button--primary md-button--block"
            disabled={noteLibrary.rootName === null}
            onClick={onCreateNote}
          >
            ＋ 新建笔记
          </button>
          <div className="md-sidebar__footer-row">
            <button
              type="button"
              className="md-button"
              onClick={() => void noteLibrary.refresh()}
            >
              刷新
            </button>
            <button
              type="button"
              className="md-button"
              onClick={() => void noteLibrary.chooseDirectory()}
            >
              切换文件夹
            </button>
          </div>
        </footer>
      ) : null}
    </aside>
  )
}
