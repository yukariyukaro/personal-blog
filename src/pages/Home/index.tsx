import { useEffect, useMemo, useRef, useState } from 'react'
import { resolvePublicAsset } from '../../utils/baseUrl'
import Navbar from '../../components/Navbar'
import EasterEggHint from '../../components/EasterEggHint'
import './home.css'

const HOME_IMAGE_SRC = resolvePublicAsset('home/home.webp')
const HOME_AV1_VIDEO_SRC = resolvePublicAsset('home/home_av1.webm')
const QUOTE_TEXT = '我们都是小怪兽，总有一天会被正义的奥特曼杀死。'

type NetworkInformationLike = {
  saveData?: boolean
  effectiveType?: string
}

type NavigatorWithConnection = Navigator & {
  connection?: NetworkInformationLike
}

function Home() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isVideoReady, setIsVideoReady] = useState(false)
  const [hasVideoError, setHasVideoError] = useState(false)
  const [isVideoEnabled, setIsVideoEnabled] = useState(true)
  const [typedLength, setTypedLength] = useState(() =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ? QUOTE_TEXT.length : 0,
  )

  const canUseVideo = useMemo(
    () => isVideoEnabled && !hasVideoError,
    [isVideoEnabled, hasVideoError],
  )

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const connection = (navigator as NavigatorWithConnection).connection
    const updateVideoAvailability = () => {
      const reduceMotion = mediaQuery.matches
      const saveData = Boolean(connection?.saveData)
      const effectiveType = connection?.effectiveType ?? ''
      const isSlowNetwork =
        effectiveType === 'slow-2g' ||
        effectiveType === '2g' ||
        effectiveType === '3g'
      setIsVideoEnabled(!reduceMotion && !saveData && !isSlowNetwork)
    }

    updateVideoAvailability()
    mediaQuery.addEventListener('change', updateVideoAvailability)
    return () => {
      mediaQuery.removeEventListener('change', updateVideoAvailability)
    }
  }, [])

  useEffect(() => {
    const videoElement = videoRef.current
    if (!videoElement || !canUseVideo) {
      return
    }

    const markVideoReady = () => {
      setIsVideoReady(true)
    }
    const handleError = () => {
      setHasVideoError(true)
      setIsVideoReady(false)
    }

    videoElement.addEventListener('loadeddata', markVideoReady)
    videoElement.addEventListener('canplay', markVideoReady)
    videoElement.addEventListener('playing', markVideoReady)
    videoElement.addEventListener('error', handleError)

    if (videoElement.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      markVideoReady()
    }

    videoElement.play().catch((error: unknown) => {
      if (import.meta.env.DEV) {
        console.warn('[HomeVideo] play() rejected', error)
      }
    })

    return () => {
      videoElement.removeEventListener('loadeddata', markVideoReady)
      videoElement.removeEventListener('canplay', markVideoReady)
      videoElement.removeEventListener('playing', markVideoReady)
      videoElement.removeEventListener('error', handleError)
      videoElement.pause()
      videoElement.currentTime = 0
    }
  }, [canUseVideo])

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion) {
      return
    }

    const totalDuration = 3500
    const delayDuration = 2000
    const totalSteps = QUOTE_TEXT.length
    const stepDuration = totalDuration / totalSteps
    let timeoutId = 0
    let intervalId = 0

    timeoutId = window.setTimeout(() => {
      let current = 0
      intervalId = window.setInterval(() => {
        current += 1
        setTypedLength(current)
        if (current >= totalSteps) {
          window.clearInterval(intervalId)
        }
      }, stepDuration)
    }, delayDuration)

    return () => {
      window.clearTimeout(timeoutId)
      window.clearInterval(intervalId)
    }
  }, [])

  return (
    <main className="home-container">
      {/* 顶部毛玻璃导航栏组件 */}
      <Navbar />

      {/* 绝对定位在右上角的标题 */}
      <div className="home-title-container">
        <h1 className="home-title">娄宿三's blog</h1>
        <div className="home-title-easter-egg">
          <EasterEggHint />
        </div>
      </div>

      {/* 中心偏上内容区 (引用名言) */}
      <header className="home-hero">
        <div className="home-hero__quote-container" aria-label={QUOTE_TEXT}>
          <p className="home-hero__quote" aria-hidden="true">
            <span className="home-hero__quote-text">{QUOTE_TEXT.slice(0, typedLength)}</span>
          </p>
        </div>
      </header>

      {/* 背景层 */}
      <section className="home-bg" aria-label="home background">
        <img
          className={`home-bg__image ${isVideoReady ? 'is-hidden' : ''}`}
          src={HOME_IMAGE_SRC}
          alt=""
          aria-hidden="true"
          loading="eager"
          fetchPriority="high"
        />
        {canUseVideo && (
          <video
            ref={videoRef}
            className={`home-bg__video ${isVideoReady ? 'is-visible' : ''}`}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            aria-hidden="true"
          >
            <source src={HOME_AV1_VIDEO_SRC} type='video/webm; codecs="av01.0.05M.08"' />
          </video>
        )}
      </section>
    </main>
  )
}

export default Home
