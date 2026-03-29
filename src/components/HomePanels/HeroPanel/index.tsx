import { useEffect, useMemo, useRef, useState } from 'react'
import Hls from 'hls.js'
import EasterEggHint from '../../EasterEggHint'
import './HeroPanel.css'

type HeroPanelProps = {
  panelClass: string
  quoteText: string
  typedLength: number
  canUseVideo: boolean
  imageSrc: string
  hlsManifestSrc: string
  fallbackVideoSrc: string
}

function HeroPanel({
  panelClass,
  quoteText,
  typedLength,
  canUseVideo,
  imageSrc,
  hlsManifestSrc,
  fallbackVideoSrc,
}: HeroPanelProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const hlsRef = useRef<Hls | null>(null)
  const [isVideoLoaded, setIsVideoLoaded] = useState(false)
  const [isVideoVisible, setIsVideoVisible] = useState(false)
  const [videoMode, setVideoMode] = useState<'hls' | 'file'>('hls')
  const [hasVideoError, setHasVideoError] = useState(false)
  const activeVideoSrc = useMemo(
    () => (videoMode === 'hls' ? '' : fallbackVideoSrc),
    [fallbackVideoSrc, videoMode],
  )
  const activeVideoMimeType = useMemo(
    () =>
      videoMode === 'hls'
        ? 'application/vnd.apple.mpegurl'
        : 'video/webm; codecs="av01.0.05M.08"',
    [videoMode],
  )
  const shouldRenderVideo = canUseVideo && !hasVideoError

  useEffect(() => {
    if (!shouldRenderVideo || videoMode !== 'hls') {
      return
    }

    const win = window as Window & {
      requestIdleCallback?: (callback: IdleRequestCallback) => number
      cancelIdleCallback?: (handle: number) => void
    }

    const warmup = () => {
      const initUrl = new URL('init.mp4', hlsManifestSrc).toString()
      const firstSegmentUrl = new URL('segment_000.m4s', hlsManifestSrc).toString()
      const urls = [hlsManifestSrc, initUrl, firstSegmentUrl]
      for (const url of urls) {
        void fetch(url, {
          mode: 'cors',
          credentials: 'omit',
          cache: 'force-cache',
        }).catch(() => undefined)
      }
    }

    if (win.requestIdleCallback) {
      const idleId = win.requestIdleCallback(warmup)
      return () => {
        if (win.cancelIdleCallback) {
          win.cancelIdleCallback(idleId)
        }
      }
    }

    const timerId = window.setTimeout(warmup, 300)
    return () => {
      window.clearTimeout(timerId)
    }
  }, [hlsManifestSrc, shouldRenderVideo, videoMode])

  useEffect(() => {
    if (!shouldRenderVideo) {
      return
    }

    const videoElement = videoRef.current
    if (!videoElement) {
      return
    }

    setIsVideoLoaded(false)
    setIsVideoVisible(false)

    if (hlsRef.current) {
      hlsRef.current.destroy()
      hlsRef.current = null
    }

    videoElement.pause()
    videoElement.removeAttribute('src')
    videoElement.load()

    if (videoMode !== 'hls') {
      videoElement.src = fallbackVideoSrc
      videoElement.load()
      return
    }

    const canPlayNativeHls = videoElement.canPlayType('application/vnd.apple.mpegurl') !== ''
    if (canPlayNativeHls) {
      videoElement.src = hlsManifestSrc
      videoElement.load()
      return
    }

    if (!Hls.isSupported()) {
      setVideoMode('file')
      return
    }

    const hls = new Hls({
      enableWorker: true,
      maxBufferLength: 8,
      maxMaxBufferLength: 12,
      startFragPrefetch: true,
    })

    hlsRef.current = hls
    hls.attachMedia(videoElement)
    hls.on(Hls.Events.MEDIA_ATTACHED, () => {
      hls.loadSource(hlsManifestSrc)
    })
    hls.on(Hls.Events.ERROR, (_, data) => {
      if (!data.fatal) {
        return
      }
      hls.destroy()
      hlsRef.current = null
      if (videoMode === 'hls') {
        setVideoMode('file')
        return
      }
      setHasVideoError(true)
    })

    return () => {
      hls.destroy()
      if (hlsRef.current === hls) {
        hlsRef.current = null
      }
    }
  }, [fallbackVideoSrc, hlsManifestSrc, shouldRenderVideo, videoMode])

  useEffect(() => {
    const videoElement = videoRef.current
    if (!videoElement || !shouldRenderVideo) {
      return
    }

    const markVideoLoaded = () => {
      setIsVideoLoaded(true)
    }

    const handleError = () => {
      if (videoMode === 'hls') {
        setVideoMode('file')
        return
      }
      setHasVideoError(true)
      setIsVideoLoaded(false)
      setIsVideoVisible(false)
    }

    videoElement.addEventListener('canplaythrough', markVideoLoaded)
    videoElement.addEventListener('error', handleError)

    if (videoElement.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) {
      markVideoLoaded()
    }

    return () => {
      videoElement.removeEventListener('canplaythrough', markVideoLoaded)
      videoElement.removeEventListener('error', handleError)
    }
  }, [shouldRenderVideo, videoMode])

  useEffect(() => {
    const videoElement = videoRef.current
    if (!videoElement || !shouldRenderVideo || !isVideoLoaded) {
      return
    }

    const revealTimer = window.setTimeout(() => {
      videoElement.play().catch(() => undefined)

      let isRevealed = false
      const reveal = () => {
        if (isRevealed) {
          return
        }
        isRevealed = true
        setIsVideoVisible(true)
      }

      const withVideoFrameCallback = videoElement as HTMLVideoElement & {
        requestVideoFrameCallback?: (callback: () => void) => number
      }

      if (typeof withVideoFrameCallback.requestVideoFrameCallback === 'function') {
        withVideoFrameCallback.requestVideoFrameCallback(() => {
          reveal()
        })
      } else {
        const handleFirstTimeUpdate = () => {
          reveal()
        }
        videoElement.addEventListener('timeupdate', handleFirstTimeUpdate, { once: true })
        window.setTimeout(() => {
          reveal()
        }, 260)
      }
    }, 180)

    return () => {
      window.clearTimeout(revealTimer)
    }
  }, [isVideoLoaded, shouldRenderVideo])

  useEffect(
    () => () => {
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }
    },
    [],
  )

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
        {shouldRenderVideo && (
          <video
            ref={videoRef}
            className={`home-bg__video ${isVideoLoaded ? 'is-primed' : ''} ${isVideoVisible ? 'is-visible' : ''}`}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            aria-hidden="true"
            onLoadStart={() => {
              setIsVideoLoaded(false)
              setIsVideoVisible(false)
            }}
          >
            {activeVideoSrc ? <source src={activeVideoSrc} type={activeVideoMimeType} /> : null}
          </video>
        )}
      </section>
    </section>
  )
}

export default HeroPanel
