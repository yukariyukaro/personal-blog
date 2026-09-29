import { useEffect, useState } from 'react'
import type { ChangeEvent, MouseEvent } from 'react'
import type { Frontmatter } from './lib/frontmatter'
import { toSlug } from './lib/frontmatter'

type PublishPanelProps = {
  frontmatter: Frontmatter
  errors: string[]
  onChange: (patch: Partial<Frontmatter>) => void
  onClose: () => void
  onExport: () => void
}

export default function PublishPanel({
  frontmatter,
  errors,
  onChange,
  onClose,
  onExport,
}: PublishPanelProps) {
  const [tagsText, setTagsText] = useState(() => frontmatter.tags.join(', '))

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const handleTagsChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value
    setTagsText(value)
    onChange({
      tags: value
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag !== ''),
    })
  }

  const handleBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose()
    }
  }

  return (
    <div
      className="md-publish"
      role="dialog"
      aria-label="发布信息"
      onClick={handleBackdropClick}
    >
      <div className="md-publish__panel">
        <header className="md-publish__header">
          <div>
            <p className="md-publish__eyebrow">FRONTMATTER</p>
            <h2 className="md-publish__title">发布信息</h2>
          </div>
          <button
            type="button"
            className="md-icon-button"
            aria-label="关闭发布信息"
            onClick={onClose}
          >
            ×
          </button>
        </header>

        <div className="md-publish__fields">
          <label className="md-field">
            <span className="md-field__label">标题</span>
            <input
              value={frontmatter.title}
              onChange={(event) => onChange({ title: event.target.value })}
            />
          </label>

          <label className="md-field">
            <span className="md-field__label">slug</span>
            <div className="md-field__row">
              <input
                value={frontmatter.slug}
                placeholder="lowercase-with-hyphens"
                onChange={(event) => onChange({ slug: event.target.value })}
              />
              <button
                type="button"
                className="md-button"
                disabled={frontmatter.title.trim() === ''}
                onClick={() => onChange({ slug: toSlug(frontmatter.title) })}
              >
                由标题生成
              </button>
            </div>
          </label>

          <label className="md-field">
            <span className="md-field__label">摘要</span>
            <textarea
              rows={2}
              value={frontmatter.summary}
              onChange={(event) => onChange({ summary: event.target.value })}
            />
          </label>

          <label className="md-field">
            <span className="md-field__label">发布日期</span>
            <input
              type="date"
              value={frontmatter.publishedAt}
              onChange={(event) => onChange({ publishedAt: event.target.value })}
            />
          </label>

          <label className="md-field">
            <span className="md-field__label">分类</span>
            <input
              value={frontmatter.category}
              onChange={(event) => onChange({ category: event.target.value })}
            />
          </label>

          <label className="md-field">
            <span className="md-field__label">标签（逗号分隔）</span>
            <input value={tagsText} onChange={handleTagsChange} />
          </label>

          <label className="md-field">
            <span className="md-field__label">封面图（可选）</span>
            <input
              value={frontmatter.coverImage ?? ''}
              onChange={(event) => onChange({ coverImage: event.target.value })}
            />
          </label>

          <label className="md-checkbox">
            <input
              type="checkbox"
              checked={frontmatter.draft === true}
              onChange={(event) => onChange({ draft: event.target.checked })}
            />
            <span>标记为草稿</span>
          </label>
        </div>

        {errors.length > 0 ? (
          <ul className="md-publish__errors">
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        ) : (
          <p className="md-publish__ok">
            frontmatter 校验通过，导出后可直接放入 blog-content/posts。
          </p>
        )}

        <footer className="md-publish__actions">
          <button type="button" className="md-button" onClick={onClose}>
            关闭
          </button>
          <button
            type="button"
            className="md-button md-button--primary"
            disabled={errors.length > 0}
            onClick={onExport}
          >
            导出 .md
          </button>
        </footer>
      </div>
    </div>
  )
}
