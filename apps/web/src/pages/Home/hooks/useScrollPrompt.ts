import { useEffect, useState } from 'react'

/** 首屏可滚动余量在此比例以内时显示「滑动」提示。 */
const SCROLL_PROMPT_THRESHOLD = 0.35

/**
 * 首屏滑动提示的可见性。用 rAF 节流滚动回调，并且只在布尔值翻转时写入 state，
 * 避免滚动期间每帧都触发一次 React 更新。
 */
export function useScrollPrompt() {
  const [isScrollPromptVisible, setIsScrollPromptVisible] = useState(true)

  useEffect(() => {
    let animationFrameId = 0
    let isPromptVisibleNow = true

    const updateScrollPrompt = () => {
      animationFrameId = 0
      const nextVisible = window.scrollY < window.innerHeight * SCROLL_PROMPT_THRESHOLD
      if (nextVisible === isPromptVisibleNow) {
        return
      }
      isPromptVisibleNow = nextVisible
      setIsScrollPromptVisible(nextVisible)
    }

    const handleScroll = () => {
      if (animationFrameId === 0) {
        animationFrameId = window.requestAnimationFrame(updateScrollPrompt)
      }
    }

    updateScrollPrompt()
    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleScroll)

    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleScroll)
      if (animationFrameId !== 0) {
        window.cancelAnimationFrame(animationFrameId)
      }
    }
  }, [])

  return isScrollPromptVisible
}
