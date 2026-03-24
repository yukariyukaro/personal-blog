import { useEffect, useMemo, useRef, useState } from 'react'
import './home.css'

const HOME_IMAGE_SRC = '/home/home.webp'
const HOME_AV1_VIDEO_SRC = '/home/home_av1.webm'
const HOME_MP4_VIDEO_SRC = '/home/home.mp4'

type NetworkInformationLike = {
  saveData?: boolean
  effectiveType?: string
}

function Home() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isVideoReady, setIsVideoReady] = useState(false)
  const [hasVideoError, setHasVideoError] = useState(false)
  const [isVideoEnabled, setIsVideoEnabled] = useState(true)

  const canUseVideo = useMemo(
    () => isVideoEnabled && !hasVideoError,
    [isVideoEnabled, hasVideoError],
  )

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const connection = navigator.connection as NetworkInformationLike | undefined
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

  // 移除全局 Loading 动画
  useEffect(() => {
    const loadingEl = document.getElementById('global-loading')
    if (loadingEl) {
      // 延迟一小段时间，确保过渡动画可见
      const timer = setTimeout(() => {
        loadingEl.classList.add('is-hidden')
        setTimeout(() => {
          loadingEl.remove()
        }, 500) // 与 CSS 中的 transition 时间保持一致
      }, 300)
      return () => clearTimeout(timer)
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

  return (
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
          <source src={HOME_MP4_VIDEO_SRC} type="video/mp4" />
        </video>
      )}
    </section>
  )
}

export default Home
