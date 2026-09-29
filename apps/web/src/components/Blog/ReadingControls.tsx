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
  const progressBarRef = useRef<HTMLDivElement | null>(null)
  const [isBackToTopVisible, setIsBackToTopVisible] = useState(false)

  useEffect(() => {
    // 记录上一次写入 React 的阈值状态：进度条本身直接改 DOM，
    // 只有这个布尔值需要交给 React 才能驱动按钮的挂载/卸载
    let isBackToTopVisibleNow = false

    // 阅读进度是连续值、每帧都在变：直接写样式，避免滚动时每帧触发 React 重渲染
    const renderProgress = (progress: number) => {
      const progressBar = progressBarRef.current
      if (progressBar) {
        progressBar.style.transform = `scaleX(${progress})`
      }
    }

    const updateReadingState = () => {
      animationFrameRef.current = 0
      const element = articleSectionRef.current
      const pageHeight =
        document.documentElement.scrollHeight - window.innerHeight
      const documentProgress =
        pageHeight > 0
          ? Math.min(Math.max(window.scrollY / pageHeight, 0), 1)
          : 0

      const nextBackToTopVisible = window.scrollY > window.innerHeight * 0.8
      if (nextBackToTopVisible !== isBackToTopVisibleNow) {
        isBackToTopVisibleNow = nextBackToTopVisible
        setIsBackToTopVisible(nextBackToTopVisible)
      }

      if (!element) {
        renderProgress(documentProgress)
        return
      }

      const rect = element.getBoundingClientRect()
      const articleHeight = Math.max(
        element.scrollHeight - window.innerHeight,
        1,
      )
      renderProgress(
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
        ref={progressBarRef}
        className="blog-reading-progress"
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
