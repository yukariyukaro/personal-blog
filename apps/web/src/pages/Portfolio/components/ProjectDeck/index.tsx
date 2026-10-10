import { useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent, MouseEvent } from 'react'
import ProjectArtwork from '../ProjectArtwork'
import { getCardSlot, getFileNumber, normalizeProjectIndex, PROJECTS } from '../../utils/projects'
import { getProjectStep } from '../../utils/portfolioNavigation'
import './ProjectDeck.css'

type ProjectDeckProps = {
  activeIndex: number
  opening: boolean
  onStep: (direction: 1 | -1) => void
  onCardClick: (index: number, event: MouseEvent<HTMLButtonElement>) => void
}

function Reel() {
  return <span className="portfolio-tape__reel"><span /><i /><i /><i /></span>
}

export default function ProjectDeck({ activeIndex, opening, onStep, onCardClick }: ProjectDeckProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const [focusIndex, setFocusIndex] = useState<number | null>(null)
  const cardRefs = useRef<(HTMLButtonElement | null)[]>([])
  const pendingFocus = useRef<number | null>(null)

  useLayoutEffect(() => {
    if (pendingFocus.current !== activeIndex) return
    pendingFocus.current = null
    cardRefs.current[activeIndex]?.focus({ preventScroll: true })
  }, [activeIndex])

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const step = getProjectStep(event)
    if (!step || opening) return
    event.preventDefault()
    pendingFocus.current = normalizeProjectIndex(activeIndex + step)
    onStep(step)
  }

  return (
    <div className="portfolio-carousel" role="region" aria-label="作品档案轮播" aria-roledescription="轮播">
      <div className="portfolio-carousel__register" aria-hidden="true"><span>PLAY / SELECTED ARCHIVE</span><span>VOL. {getFileNumber(activeIndex)}</span></div>
      <div className="portfolio-carousel__cards">
        {PROJECTS.map((project, index) => {
          const slot = getCardSlot(index, activeIndex)
          const active = index === activeIndex
          const expanded = active && (opening || hoverIndex === index || focusIndex === index)
          return (
            <button
              type="button"
              className={`portfolio-card portfolio-card--slot-${slot} ${active ? 'is-active' : ''}`}
              key={project.id}
              ref={element => { cardRefs.current[index] = element }}
              tabIndex={active ? 0 : -1}
              style={{ '--card-slot': slot } as CSSProperties}
              aria-pressed={active}
              aria-label={`${project.title}，${active ? '当前作品，点击打开详情' : '切换作品'}`}
              data-expanded={expanded}
              data-artwork={project.artwork}
              hidden={Math.abs(slot) > 1}
              disabled={opening}
              onPointerEnter={event => {
                if (event.pointerType !== 'touch' && window.matchMedia('(hover: hover) and (pointer: fine)').matches) setHoverIndex(index)
              }}
              onPointerLeave={() => setHoverIndex(null)}
              onFocus={() => setFocusIndex(index)}
              onBlur={() => setFocusIndex(null)}
              onKeyDown={handleKeyDown}
              onClick={event => onCardClick(index, event)}
            >
              <span className="portfolio-card__tape" aria-hidden="true">
                <span className="portfolio-tape__ridges" />
                <Reel />
                <span className="portfolio-tape__label"><strong>{project.englishTitle.replace('\n', ' ')}</strong><span>{project.title}</span><b>{getFileNumber(index)}</b></span>
                <Reel />
                <span className="portfolio-tape__spine">LOUSUSAN — SELECTED WORKS / {project.code}</span>
              </span>
              <span className="portfolio-card__cover">
                <span className="portfolio-card__micro"><span className="portfolio-card__mark" aria-hidden="true">L<span>／</span>S</span><span>{getFileNumber(index)} / ARCHIVE<br />{project.code}</span></span>
                <strong>{project.englishTitle.split('\n').map(line => <span key={line}>{line}</span>)}</strong>
                <em>{project.title}</em>
                <span className="portfolio-card__window" aria-hidden="true"><ProjectArtwork project={project} /><span className="portfolio-card__slash" /></span>
                <small>{project.summary}</small>
                <b>打开档案 <span>OPEN FILE ↗</span></b>
              </span>
            </button>
          )
        })}
      </div>
      <div className="portfolio-carousel__controls">
        <button type="button" className="portfolio-arrow portfolio-arrow--prev" aria-label="上一个作品" disabled={opening} onClick={() => onStep(-1)}><span aria-hidden="true">❮</span></button>
        <p className="portfolio-carousel__status" role="status" aria-atomic="true"><span>{getFileNumber(activeIndex)}</span><span>/ {getFileNumber(PROJECTS.length - 1)}</span><strong>{PROJECTS[activeIndex].title}</strong></p>
        <button type="button" className="portfolio-arrow portfolio-arrow--next" aria-label="下一个作品" disabled={opening} onClick={() => onStep(1)}><span aria-hidden="true">❯</span></button>
      </div>
    </div>
  )
}
