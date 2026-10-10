import { useEffect, useMemo, useRef, useState } from 'react'
import type Hls from 'hls.js'
import EasterEggHint from '../../../../components/EasterEggHint'
import HeroRail from './HeroRail'
import HeroQuote from './HeroQuote'
import { useHeroEntrance } from './useHeroEntrance'
import { markHeroVideoReady } from '../../../../utils/heroVideoReady'
import './HeroPanel.css'

type HeroPanelProps = {
  panelClass: string
  quoteText: string
  canUseVideo: boolean
  imageSrc: string
  hlsManifestSrc: string
  fallbackVideoSrc: string
}

function HeroPanel({
  panelClass,
  quoteText,
  canUseVideo,
  imageSrc,
  hlsManifestSrc,
  fallbackVideoSrc,
}: HeroPanelProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const isEntranceReady = useHeroEntrance()
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
        : 'video/webm; codecs="vp09.00.41.08"',
    [videoMode],
  )
  const shouldRenderVideo = canUseVideo && !hasVideoError

  // 不走视频（减弱动效/省流/慢网）或视频彻底失败：立即广播就绪，Loading 直接揭开展示静态图
  useEffect(() => {
    if (!shouldRenderVideo) {
      markHeroVideoReady()
    }
  }, [shouldRenderVideo])

  useEffect(() => {
    if (!shouldRenderVideo || videoMode !== 'hls') {
      return
    }

    // Loading 屏期间是视频加载的唯一窗口，预热不再等空闲时机，挂载即拉取
    const warmup = () => {
      const manifestUrl = new URL(hlsManifestSrc, window.location.href)
      const initUrl = new URL('init.mp4', manifestUrl).toString()
      const firstSegmentUrl = new URL('segment_000.m4s', manifestUrl).toString()
      const urls = [hlsManifestSrc, initUrl, firstSegmentUrl]
      for (const url of urls) {
        void fetch(url, {
          mode: 'cors',
          credentials: 'omit',
          cache: 'force-cache',
        }).catch(() => undefined)
      }
    }

    warmup()
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

    let isCancelled = false
    let hls: Hls | null = null

    const loadHls = async () => {
      const { default: HlsConstructor } = await import('hls.js')
      if (isCancelled || !HlsConstructor.isSupported()) {
        if (!isCancelled) {
          setVideoMode('file')
        }
        return
      }

      hls = new HlsConstructor({
        enableWorker: true,
        maxBufferLength: 8,
        maxMaxBufferLength: 12,
        startFragPrefetch: true,
      })

      hlsRef.current = hls
      hls.attachMedia(videoElement)
      hls.on(HlsConstructor.Events.MEDIA_ATTACHED, () => {
        hls?.loadSource(hlsManifestSrc)
      })
      hls.on(HlsConstructor.Events.ERROR, (_, data) => {
        if (!data.fatal || !hls) {
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
    }

    void loadHls()

    return () => {
      isCancelled = true
      hls?.destroy()
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

    // 与字体资源同级的高加载优先级：Loading 等待期就是视频的加载窗口
    const withFetchPriority = videoElement as HTMLVideoElement & {
      fetchPriority?: 'high' | 'low' | 'auto'
    }
    if ('fetchPriority' in withFetchPriority) {
      withFetchPriority.fetchPriority = 'high'
    }

    const markVideoLoaded = () => {
      setIsVideoLoaded(true)
      // canplay 即广播就绪：Loading 揭开不等「播放成功 + 首帧回调」，
      // 否则自动播放被拒或 StrictMode 重挂载竞态会让信号丢失、吃满超时
      markHeroVideoReady()
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

    videoElement.addEventListener('canplay', markVideoLoaded)
    videoElement.addEventListener('error', handleError)

    if (videoElement.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
      markVideoLoaded()
    }

    return () => {
      videoElement.removeEventListener('canplay', markVideoLoaded)
      videoElement.removeEventListener('error', handleError)
    }
  }, [shouldRenderVideo, videoMode])

  useEffect(() => {
    const videoElement = videoRef.current
    if (!videoElement || !shouldRenderVideo || !isVideoLoaded) {
      return
    }

    // 视频可播放即拉起播放；第一帧渲染后做渐显切换
    videoElement.play().catch(() => {
      // 自动播放被策略拒绝：画面停在当前帧/静态图，但不能拖住 Loading
      markHeroVideoReady()
    })

    let isRevealed = false
    const reveal = () => {
      if (isRevealed) {
        return
      }
      isRevealed = true
      setIsVideoVisible(true)
      markHeroVideoReady()
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
    <section className={`home-panel ${panelClass}`} aria-label="home hero panel" data-entrance-ready={isEntranceReady}>
      <div className="home-top-frame" aria-hidden="true"><span>FIELD RECORD / PERSONAL ARCHIVE</span><span>INDEX — 00</span></div>
      <div className="home-info-container">
        <p className="home-info-kicker">00 / PERSONAL ARCHIVE</p>
        <div className="home-info-divider" aria-hidden="true" />
        <div className="home-info-header">
          <h1 className="home-title">娄宿三的小站</h1>
          <span className="home-subtitle">MY PERSONAL BLOG</span>
          <div className="home-title-easter-egg">
            <EasterEggHint />
          </div>
        </div>
        <div className="home-quote-container">
          <HeroQuote text={quoteText} isReady={isEntranceReady} />
        </div>
      </div>

      <HeroRail />

      <section className="home-bg" aria-label="home background">
        <img
          className="home-bg__image"
          src={imageSrc}
          alt=""
          aria-hidden="true"
          loading="eager"
          fetchPriority="high"
        />
        {shouldRenderVideo && (
          <video
            ref={videoRef}
            className={`home-bg__video ${isVideoVisible ? 'is-visible' : ''}`}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
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
