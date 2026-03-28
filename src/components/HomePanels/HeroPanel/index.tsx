import type { RefObject } from 'react'
import EasterEggHint from '../../EasterEggHint'
import './HeroPanel.css'

type HeroPanelProps = {
  panelClass: string
  quoteText: string
  typedLength: number
  canUseVideo: boolean
  isVideoLoaded: boolean
  isVideoVisible: boolean
  imageSrc: string
  videoSrc: string
  videoRef: RefObject<HTMLVideoElement | null>
  onVideoLoadStart: () => void
}

function HeroPanel({
  panelClass,
  quoteText,
  typedLength,
  canUseVideo,
  isVideoLoaded,
  isVideoVisible,
  imageSrc,
  videoSrc,
  videoRef,
  onVideoLoadStart,
}: HeroPanelProps) {
  return (
    <section className={`home-panel ${panelClass}`} aria-label="home hero panel">
      <div className="home-info-container">
        <div className="home-info-divider"></div>
        <div className="home-info-header">
          <h1 className="home-title">娄宿三的小站</h1>
          <span className="home-subtitle">my personal blog</span>
          <div className="home-title-easter-egg">
            <EasterEggHint />
          </div>
        </div>
        <div className="home-quote-container" aria-label={quoteText}>
          <p className="home-quote" aria-hidden="true">
            <span className="home-quote-text">{quoteText.slice(0, typedLength)}</span>
          </p>
        </div>
      </div>

      <section className="home-bg" aria-label="home background">
        <img
          className={`home-bg__image ${canUseVideo && isVideoLoaded ? 'is-soft' : ''} ${canUseVideo && isVideoVisible ? 'is-hidden' : ''}`}
          src={imageSrc}
          alt=""
          aria-hidden="true"
          loading="eager"
          fetchPriority="high"
        />
        {canUseVideo && (
          <video
            ref={videoRef}
            className={`home-bg__video ${isVideoLoaded ? 'is-primed' : ''} ${isVideoVisible ? 'is-visible' : ''}`}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            aria-hidden="true"
            onLoadStart={onVideoLoadStart}
          >
            <source src={videoSrc} type='video/webm; codecs="av01.0.05M.08"' />
          </video>
        )}
      </section>
    </section>
  )
}

export default HeroPanel
