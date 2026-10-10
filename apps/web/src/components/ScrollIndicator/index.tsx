import './ScrollIndicator.css'

interface ScrollIndicatorProps {
  visible?: boolean
  onActivate?: () => void
}

export default function ScrollIndicator({ visible = true, onActivate }: ScrollIndicatorProps) {
  const content = (
    <>
      <span className="scroll-beacon" aria-hidden="true">
        <svg viewBox="0 0 40 40" focusable="false">
          <path className="scroll-beacon__frame" d="M15 3H8L3 8V15M25 3H32L37 8V15M37 25V32L32 37H25M15 37H8L3 32V25" />
          <path className="scroll-beacon__star" d="M20 7 23.5 16.5 33 20 23.5 23.5 20 33 16.5 23.5 7 20 16.5 16.5Z" />
          <path className="scroll-beacon__axis" d="M20 0V3M37 20H40M20 37V40M0 20H3" />
        </svg>
      </span>
      <span className="scroll-text" aria-hidden="true"><span className="scroll-text__desktop">SCROLL</span><span className="scroll-text__mobile">滑动</span></span>
      <span className="scroll-chevron" aria-hidden="true">
        <svg viewBox="0 0 32 22" focusable="false">
          <path className="scroll-chevron__first" d="M3 2 16 11 29 2" />
          <path className="scroll-chevron__second" d="M7 11 16 17 25 11" />
        </svg>
      </span>
    </>
  )

  const className = `scroll-indicator ${visible ? 'scroll-indicator--visible' : 'scroll-indicator--hidden'} ${onActivate ? 'scroll-indicator--interactive' : ''}`

  if (onActivate) {
    return (
      <button className={className} type="button" aria-label="滑动查看文章"
        aria-hidden={!visible} disabled={!visible} onClick={onActivate}>
        {content}
      </button>
    )
  }

  return <div className={className} aria-label="向下滚动查看更多" aria-hidden={!visible}>{content}</div>
}
