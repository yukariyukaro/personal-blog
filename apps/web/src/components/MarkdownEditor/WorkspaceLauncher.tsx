import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { ArticleSummary } from '../../utils/contentApi'
import type { NoteLibrary } from './hooks/useNoteLibrary'
import type { OnlineArticles } from './hooks/useOnlineArticles'
import type { LauncherView, Theme } from './types'

type WorkspaceLauncherProps = {
  noteLibrary: NoteLibrary
  onlineArticles: OnlineArticles
  draftFileName: string | null
  draftSavedAt: number | null
  onRestoreDraft: () => void
  onOpenOnline: (summary: ArticleSummary) => void
  theme: Theme
  onToggleTheme: () => void
}

const formatDraftTime = (timestamp: number) =>
  new Date(timestamp).toLocaleString('zh-CN', {
    hour12: false,
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

export default function WorkspaceLauncher({
  noteLibrary,
  onlineArticles,
  draftFileName,
  draftSavedAt,
  onRestoreDraft,
  onOpenOnline,
  theme,
  onToggleTheme,
}: WorkspaceLauncherProps) {
  const [view, setView] = useState<LauncherView>('home')
  const themeLabel = theme === 'dark' ? '切换到浅色主题' : '切换到深色主题'

  const directoryLabel =
    noteLibrary.needsPermission && noteLibrary.rootName !== null
      ? `重新授权「${noteLibrary.rootName}」`
      : noteLibrary.rootName !== null
        ? `继续使用「${noteLibrary.rootName}」`
        : '打开笔记文件夹'

  return (
    <div className="md-launcher">
      <button
        type="button"
        className="md-icon-button md-launcher__theme-toggle"
        aria-label={themeLabel}
        title={themeLabel}
        onClick={onToggleTheme}
      >
        <span aria-hidden="true">{theme === 'dark' ? '☼' : '◐'}</span>
      </button>
      <header className="md-launcher__header">
        <p className="md-launcher__eyebrow">MD WORKSPACE</p>
        <h1 className="md-launcher__title">笔记写作台</h1>
        <p className="md-launcher__subtitle">
          打开本地笔记文件夹，或从本站已发布文章中挑一篇只读打开。
        </p>
      </header>

      {noteLibrary.error !== null ? (
        <p className="md-launcher__status md-launcher__status--error">
          {noteLibrary.error}
        </p>
      ) : null}

      {view === 'home' ? (
        <div className="md-launcher__cards">
          <button
            type="button"
            className="md-source-card md-source-card--primary"
            onClick={() => void noteLibrary.connect()}
          >
            <span className="md-source-card__icon" aria-hidden="true">
              ▤
            </span>
            <span className="md-source-card__title">{directoryLabel}</span>
            <span className="md-source-card__meta">
              {noteLibrary.supported
                ? '授权一次，之后自动记住；保存可直写回原文件。'
                : '当前浏览器不支持目录授权，可改用「打开文件」。'}
            </span>
          </button>

          {draftSavedAt !== null ? (
            <button
              type="button"
              className="md-source-card"
              onClick={onRestoreDraft}
            >
              <span className="md-source-card__icon" aria-hidden="true">
                ◷
              </span>
              <span className="md-source-card__title">继续上次草稿</span>
              <span className="md-source-card__meta">
                {draftFileName ?? '未命名.md'} · {formatDraftTime(draftSavedAt)}
              </span>
            </button>
          ) : null}

          <button
            type="button"
            className="md-source-card"
            onClick={() => setView('online')}
          >
            <span className="md-source-card__icon" aria-hidden="true">
              ≡
            </span>
            <span className="md-source-card__title">打开线上文章</span>
            <span className="md-source-card__meta">
              从本站已发布文章中选一篇，以只读副本打开。
            </span>
          </button>
        </div>
      ) : (
        <section className="md-launcher__online">
          <div className="md-launcher__online-bar">
            <button
              type="button"
              className="md-button"
              onClick={() => setView('home')}
            >
              ← 返回
            </button>
            <label className="md-search">
              <span aria-hidden="true">⌕</span>
              <input
                value={onlineArticles.query}
                placeholder="搜索标题 / 摘要 / 标签"
                onChange={(event) => onlineArticles.setQuery(event.target.value)}
              />
            </label>
          </div>

          {onlineArticles.isLoading ? (
            <p className="md-launcher__status">正在加载文章索引…</p>
          ) : onlineArticles.error !== null ? (
            <p className="md-launcher__status md-launcher__status--error">
              {onlineArticles.error}
            </p>
          ) : onlineArticles.visibleArticles.length === 0 ? (
            <p className="md-launcher__status">没有匹配的文章。</p>
          ) : (
            <ul className="md-online-list">
              {onlineArticles.visibleArticles.map((article) => (
                <li key={article.slug}>
                  <button
                    type="button"
                    className="md-online-item"
                    onClick={() => onOpenOnline(article)}
                  >
                    <span className="md-online-item__title">
                      {article.title}
                    </span>
                    <span className="md-online-item__meta">
                      {article.publishedAt} · {article.category}
                    </span>
                    <span className="md-online-item__summary">
                      {article.summary}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <footer className="md-launcher__footer">
        <Link className="md-link" to="/Home">
          ← 返回首页
        </Link>
        <span className="md-launcher__compat">
          {noteLibrary.supported
            ? '当前浏览器支持文件直写（Chrome / Edge）'
            : '当前浏览器不支持文件直写，将改用导入 / 下载方式'}
        </span>
      </footer>
    </div>
  )
}
