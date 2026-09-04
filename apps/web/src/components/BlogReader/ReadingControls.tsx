import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'

type ReadingControlsProps = {
  articleSectionRef: RefObject<HTMLElement | null>
}

const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

export default function ReadingControls({
  articleSectionRef,
}: ReadingControlsProps) {
  const animationFrameRef = useRef(0)
  const [readingProgress, setReadingProgress] = useState(0)
  const [isBackToTopVisible, setIsBackToTopVisible] = useState(false)

  useEffect(() => {
    const updateReadingState = () => {
      animationFrameRef.current = 0
      const element = articleSectionRef.current
      const pageHeight =
        document.documentElement.scrollHeight - window.innerHeight
      const documentProgress =
        pageHeight > 0
          ? Math.min(Math.max(window.scrollY / pageHeight, 0), 1)
          : 0
      setIsBackToTopVisible(window.scrollY > window.innerHeight * 0.8)

      if (!element) {
        setReadingProgress(documentProgress)
        return
      }

      const rect = element.getBoundingClientRect()
      const articleHeight = Math.max(
        element.scrollHeight - window.innerHeight,
        1,
      )
      setReadingProgress(
        Math.min(
          Math.max((window.innerHeight - rect.top) / articleHeight, 0),
          1,
        ),
      )
    }

    const scheduleReadingStateUpdate = () => {
      if (animationFrameRef.current === 0) {
        animationFrameRef.current =
          window.requestAnimationFrame(updateReadingState)
      }
    }

    updateReadingState()
    window.addEventListener('scroll', scheduleReadingStateUpdate, {
      passive: true,
    })
    window.addEventListener('resize', scheduleReadingStateUpdate)

    const resizeObserver = new ResizeObserver(scheduleReadingStateUpdate)
    if (articleSectionRef.current) {
      resizeObserver.observe(articleSectionRef.current)
    }

    return () => {
      window.removeEventListener('scroll', scheduleReadingStateUpdate)
      window.removeEventListener('resize', scheduleReadingStateUpdate)
      resizeObserver.disconnect()
      if (animationFrameRef.current !== 0) {
        window.cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = 0
      }
    }
  }, [articleSectionRef])

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    })
  }

  return (
    <>
      <div
        className="blog-reading-progress"
        style={{ transform: `scaleX(${readingProgress})` }}
        aria-hidden="true"
      />
      {isBackToTopVisible ? (
        <button
          className="blog-back-to-top"
          type="button"
          aria-label="返回顶部"
          title="返回顶部"
          onClick={scrollToTop}
        >
          ↑
        </button>
      ) : null}
    </>
  )
}
