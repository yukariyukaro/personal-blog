import { useEffect, useMemo, useState } from 'react'
import { extractHeadings } from '../contentUtils'

export function useArticleReading(articleContent: string | null) {
  const [activeHeadingId, setActiveHeadingId] = useState<string | null>(null)
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

  return {
    articleHeadings,
    activeHeadingId: displayedActiveHeadingId,
    setActiveHeadingId,
  }
}
