import { useState, useEffect } from 'react'
import './ScrollIndicator.css'

interface ScrollIndicatorProps {
  visible?: boolean
  onActivate?: () => void
}

export default function ScrollIndicator({
  visible = true,
  onActivate,
}: ScrollIndicatorProps) {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const content = (
    <>
      <div className="scroll-mouse"></div>
      <span className="scroll-text">{isMobile ? '滑动' : 'SCROLL'}</span>
    </>
  )

  const className = `scroll-indicator ${
    visible ? 'scroll-indicator--visible' : 'scroll-indicator--hidden'
  } ${onActivate ? 'scroll-indicator--interactive' : ''}`

  if (onActivate) {
    return (
      <button
        className={className}
        type="button"
        aria-label="滑动查看文章"
        onClick={onActivate}
      >
        {content}
      </button>
    )
  }

  return (
    <div className={className} aria-label="Scroll to see more content">
      {content}
    </div>
  )
}
