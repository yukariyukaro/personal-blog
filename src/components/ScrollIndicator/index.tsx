import { useState, useEffect } from 'react'
import './ScrollIndicator.css'

interface ScrollIndicatorProps {
  visible?: boolean
}

export default function ScrollIndicator({ visible = true }: ScrollIndicatorProps) {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return (
    <div
      className={`scroll-indicator ${visible ? 'scroll-indicator--visible' : 'scroll-indicator--hidden'}`}
      aria-label="Scroll to see more content"
    >
      <div className="scroll-mouse"></div>
      <span className="scroll-text">{isMobile ? '滑动' : 'SCROLL'}</span>
    </div>
  )
}
