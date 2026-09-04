import { useEffect, useMemo, useState } from 'react'
import type { RefObject } from 'react'
import { extractHeadings } from '../contentUtils'

export function useArticleReading(
  articleContent: string | null,
  articleSectionRef: RefObject<HTMLElement | null>,
  selectedSlug: string | null,
) {
  const [activeHeadingId, setActiveHeadingId] = useState<string | null>(null)
  const [readingProgress, setReadingProgress] = useState(0)
  const [isBackToTopVisible, setIsBackToTopVisible] = useState(false)
  const articleHeadings = useMemo(
    () => (articleContent ? extractHeadings(articleContent) : []),
    [articleContent],
  )
  const displayedActiveHeadingId = articleHeadings.some(
    (heading) => heading.id === activeHeadingId,
  )
    ? activeHeadingId
    : null

  useEffect(() => {
    if (articleHeadings.length === 0) {
      return
    }

    const headingElements = articleHeadings
      .map(({ id }) => document.getElementById(id))
      .filter((heading): heading is HTMLElement => Boolean(heading))
    if (headingElements.length === 0) {
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleHeading = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (left, right) =>
              left.boundingClientRect.top - right.boundingClientRect.top,
          )[0]
        if (visibleHeading) {
          setActiveHeadingId(visibleHeading.target.id)
        }
      },
      { rootMargin: '-112px 0px -68% 0px', threshold: 0 },
    )

    headingElements.forEach((heading) => observer.observe(heading))
    return () => observer.disconnect()
  }, [articleHeadings])

  useEffect(() => {
    let animationFrameId = 0

    const updateReadingState = () => {
      animationFrameId = 0
      const element = articleSectionRef.current
      const pageHeight = document.documentElement.scrollHeight - window.innerHeight
      const documentProgress =
        pageHeight > 0 ? Math.min(Math.max(window.scrollY / pageHeight, 0), 1) : 0
      setIsBackToTopVisible(window.scrollY > window.innerHeight * 0.8)

      if (!element) {
        setReadingProgress(documentProgress)
        return
      }

      const rect = element.getBoundingClientRect()
      const articleHeight = Math.max(element.scrollHeight - window.innerHeight, 1)
      setReadingProgress(
        Math.min(Math.max((window.innerHeight - rect.top) / articleHeight, 0), 1),
      )
    }

    const handleScroll = () => {
      if (animationFrameId === 0) {
        animationFrameId = window.requestAnimationFrame(updateReadingState)
      }
    }

    updateReadingState()
    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleScroll)
    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleScroll)
      if (animationFrameId !== 0) {
        window.cancelAnimationFrame(animationFrameId)
      }
    }
  }, [articleContent, articleSectionRef, selectedSlug])

  return {
    articleHeadings,
    activeHeadingId: displayedActiveHeadingId,
    setActiveHeadingId,
    readingProgress,
    isBackToTopVisible,
  }
}
