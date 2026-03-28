import './ScrollIndicator.css'

interface ScrollIndicatorProps {
  visible?: boolean
}

export default function ScrollIndicator({ visible = true }: ScrollIndicatorProps) {
  return (
    <div
      className={`scroll-indicator ${visible ? 'scroll-indicator--visible' : 'scroll-indicator--hidden'}`}
      aria-label="Scroll to see more content"
    >
      <div className="scroll-mouse"></div>
      <span className="scroll-text">SCROLL</span>
    </div>
  )
}
