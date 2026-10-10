import { useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent } from 'react'
import ProjectArtwork from '../ProjectArtwork'
import { normalizeProjectIndex, PROJECTS } from '../../utils/projects'
import { getProjectStep } from '../../utils/portfolioNavigation'
import './ProjectDirectory.css'

type ProjectDirectoryProps = {
  activeIndex: number
  disabled: boolean
  onSelect: (index: number) => void
  onOpen: (index: number) => void
}

export default function ProjectDirectory({ activeIndex, disabled, onSelect, onOpen }: ProjectDirectoryProps) {
  const [previewIndex, setPreviewIndex] = useState<number | null>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])
  const preview = previewIndex === activeIndex ? PROJECTS[activeIndex] : null

  const hoverProject = (index: number, event: PointerEvent<HTMLButtonElement>) => {
    if (disabled || event.pointerType === 'touch' || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return
    setPreviewIndex(index)
    onSelect(index)
  }
  const movePreview = (event: PointerEvent<HTMLElement>) => {
    const element = previewRef.current
    if (!element || !preview || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const bounds = event.currentTarget.getBoundingClientRect()
    const x = (event.clientX - bounds.left) / bounds.width - 0.5
    const y = (event.clientY - bounds.top) / bounds.height - 0.5
    element.style.setProperty('--preview-x', `${Math.max(-1.5, Math.min(1.5, x * 3))}rem`)
    element.style.setProperty('--preview-y', `${Math.max(-2, Math.min(2, y * 4))}rem`)
  }
  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const step = getProjectStep(event)
    if (!step || disabled) return
    event.preventDefault()
    const next = normalizeProjectIndex(index + step)
    onSelect(next)
    itemRefs.current[next]?.focus()
  }

  return (
    <aside className="portfolio-directory" aria-label="项目目录" onPointerMove={movePreview} onPointerLeave={() => setPreviewIndex(null)}>
      <header className="portfolio-directory__heading">
        <h1>作品档案</h1><span>SELECTED WORKS / 2025—26</span>
      </header>
      <div
        className={`portfolio-directory__preview ${preview ? 'is-visible' : ''}`}
        data-project={preview?.id}
        data-orientation={preview?.imageType ?? 'graphic'}
        ref={previewRef}
        aria-hidden="true"
      >
        {preview && <ProjectArtwork key={preview.id} project={preview} />}
      </div>
      <ol>
        {PROJECTS.map((project, index) => (
          <li key={project.id}>
            <button
              type="button"
              className={`portfolio-directory__item ${index === activeIndex ? 'is-active' : ''}`}
              ref={element => { itemRefs.current[index] = element }}
              disabled={disabled}
              aria-current={index === activeIndex ? 'true' : undefined}
              onPointerEnter={event => hoverProject(index, event)}
              onPointerLeave={() => setPreviewIndex(null)}
              onFocus={() => { setPreviewIndex(null); onSelect(index) }}
              onKeyDown={event => handleKeyDown(event, index)}
              onClick={() => onOpen(index)}
            >
              <span className="portfolio-directory__ghost" aria-hidden="true">{project.englishTitle.replace('\n', ' ')}</span>
              <strong>{project.title}</strong>
              <small>{project.code}</small>
            </button>
          </li>
        ))}
      </ol>
      <p className="portfolio-directory__hint"><span>选择作品，打开档案。</span><span className="portfolio-directory__pointer-hint">悬停预览 · 滚轮 / 方向键切换</span><span className="portfolio-directory__touch-hint">轻点目录打开 · 左右滑动切换</span></p>
    </aside>
  )
}
