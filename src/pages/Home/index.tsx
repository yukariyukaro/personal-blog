import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { resolvePublicAsset } from '../../utils/baseUrl'
import { useOutletContext } from 'react-router-dom'
import type { AppContextType } from '../../App'
import Hls from 'hls.js'
import HeroPanel from '../../components/HomePanels/HeroPanel'
import SideIndicator from '../../components/SideIndicator'
import ScrollIndicator from '../../components/ScrollIndicator'
import './home.css'

const IntroPanel = lazy(() => import('../../components/HomePanels/IntroPanel'))
const DetailPanel = lazy(() => import('../../components/HomePanels/DetailPanel'))

const QUOTE_TEXT = '在你最孤独最无望的时候，有一扇门会在你身边打开。'
const HOME_STATES = ['hero', 'intro', 'detail'] as const

const PANEL_TITLES = [
  { en: 'HOMEPAGE', zh: '首页' },
  { en: 'INFORMATION', zh: '介绍' },
  { en: 'PORTFOLIO', zh: '作品' },
]

type NetworkInformationLike = {
  saveData?: boolean
  effectiveType?: string
}

type NavigatorWithConnection = Navigator & {
  connection?: NetworkInformationLike
}

type HomeState = (typeof HOME_STATES)[number]
type TransitionDirection = 'next' | 'prev'

function Home() {
  const { activeStateIndex: externalActiveIndex, setActiveStateIndex: setExternalActiveIndex } = useOutletContext<AppContextType>() || { activeStateIndex: 0, setActiveStateIndex: () => {} }
  const videoRef = useRef<HTMLVideoElement>(null)
  const touchStartYRef = useRef<number | null>(null)
  const wheelDeltaRef = useRef(0)
  const interactionLockUntilRef = useRef(0)
  const prefetchedIntroRef = useRef(false)
  const prefetchedDetailRef = useRef(false)
  const hlsRef = useRef<Hls | null>(null)
  const [isVideoLoaded, setIsVideoLoaded] = useState(false)
  const [isVideoVisible, setIsVideoVisible] = useState(false)
  const [hasVideoError, setHasVideoError] = useState(false)
  const [isVideoEnabled, setIsVideoEnabled] = useState(true)
  const [videoMode, setVideoMode] = useState<'hls' | 'file'>('hls')
  
  // Use internal state synced with external
  const [activeState, setActiveState] = useState<HomeState>(HOME_STATES[externalActiveIndex] || 'hero')
  const [transitionFromState, setTransitionFromState] = useState<HomeState | null>(null)
  const [transitionDirection, setTransitionDirection] = useState<TransitionDirection>('next')
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [renderedPanels, setRenderedPanels] = useState({
    intro: externalActiveIndex >= 1,
    detail: externalActiveIndex >= 2,
  })
  const [typedLength, setTypedLength] = useState(() =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ? QUOTE_TEXT.length : 0,
  )
  const prefersReducedMotion = useMemo(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  )
  const activeStateIndex = useMemo(() => HOME_STATES.indexOf(activeState), [activeState])

  // Sync internal state to external
  useEffect(() => {
    if (externalActiveIndex !== activeStateIndex) {
      setExternalActiveIndex(activeStateIndex)
    }
  }, [activeStateIndex, externalActiveIndex, setExternalActiveIndex])

  // Sync external state to internal (when navbar is clicked)
  useEffect(() => {
    if (externalActiveIndex !== activeStateIndex) {
      const targetState = HOME_STATES[externalActiveIndex]
      if (targetState) {
        transitionToState(targetState)
      }
    }
  }, [externalActiveIndex]) // Only listen to external index changes here

  const canUseVideo = useMemo(
    () => isVideoEnabled && !hasVideoError,
    [isVideoEnabled, hasVideoError],
  )
  const homeImageSrc = useMemo(() => resolvePublicAsset('home/home.webp'), [])
  const homeHlsVideoSrc = useMemo(() => resolvePublicAsset('home/hls/index.m3u8'), [])
  const homeAv1VideoSrc = useMemo(() => resolvePublicAsset('home/home_av1.webm'), [])
  const activeVideoSrc = useMemo(
    () => (videoMode === 'hls' ? '' : homeAv1VideoSrc),
    [homeAv1VideoSrc, videoMode],
  )
  const activeVideoMimeType = useMemo(
    () => (videoMode === 'hls' ? 'application/vnd.apple.mpegurl' : 'video/webm; codecs="av01.0.05M.08"'),
    [videoMode],
  )

  const preloadIntroPanel = useCallback(() => {
    if (prefetchedIntroRef.current) {
      return
    }
    prefetchedIntroRef.current = true
    
    // 预加载第二步（IntroPanel）的背景图
    const img = new Image()
    img.src = resolvePublicAsset('information/background.webp')

    void import('../../components/HomePanels/IntroPanel')
  }, [])

  const preloadDetailPanel = useCallback(() => {
    if (prefetchedDetailRef.current) {
      return
    }
    prefetchedDetailRef.current = true
    void import('../../components/HomePanels/DetailPanel')
  }, [])

  useEffect(() => {
    const win = window as Window & {
      requestIdleCallback?: (callback: IdleRequestCallback) => number
      cancelIdleCallback?: (handle: number) => void
    }

    if (prefetchedIntroRef.current) {
      return
    }

    if (win.requestIdleCallback) {
      const idleId = win.requestIdleCallback(() => {
        preloadIntroPanel()
      })
      return () => {
        if (win.cancelIdleCallback) {
          win.cancelIdleCallback(idleId)
        }
      }
    }

    const timer = window.setTimeout(() => {
      preloadIntroPanel()
    }, 1200)
    return () => {
      window.clearTimeout(timer)
    }
  }, [preloadIntroPanel])

  const transitionToState = useCallback(
    (targetState: HomeState) => {
      if (targetState === activeState || isTransitioning) {
        return false
      }

      if (targetState === 'intro') {
        setRenderedPanels((prev) => ({ ...prev, intro: true }))
      }
      if (targetState === 'detail') {
        setRenderedPanels((prev) => ({ ...prev, intro: true, detail: true }))
      }

      setTransitionFromState(activeState)
      setTransitionDirection(
        HOME_STATES.indexOf(targetState) > HOME_STATES.indexOf(activeState) ? 'next' : 'prev',
      )
      setActiveState(targetState)

      if (!prefersReducedMotion) {
        setIsTransitioning(true)
      }
      return true
    },
    [activeState, isTransitioning, prefersReducedMotion],
  )

  const goNext = useCallback(() => {
    if (activeStateIndex >= HOME_STATES.length - 1) {
      return false
    }
    const nextState = HOME_STATES[activeStateIndex + 1]
    if (nextState === 'intro') {
      preloadIntroPanel()
    }
    if (nextState === 'detail') {
      preloadDetailPanel()
    }
    return transitionToState(nextState)
  }, [activeStateIndex, preloadDetailPanel, preloadIntroPanel, transitionToState])

  const goPrev = useCallback(() => {
    if (activeStateIndex <= 0) {
      return false
    }
    const prevState = HOME_STATES[activeStateIndex - 1]
    return transitionToState(prevState)
  }, [activeStateIndex, transitionToState])

  const navigateWithLock = useCallback(
    (direction: TransitionDirection) => {
      const now = Date.now()
      if (isTransitioning || now < interactionLockUntilRef.current) {
        return false
      }

      const handled = direction === 'next' ? goNext() : goPrev()
      interactionLockUntilRef.current = now + (handled ? 700 : 220)
      return handled
    },
    [goNext, goPrev, isTransitioning],
  )

  useEffect(() => {
    if (activeState === 'intro') {
      preloadDetailPanel()
    }
  }, [activeState, preloadDetailPanel])

  useEffect(
    () => () => {
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }
    },
    [],
  )

  useEffect(() => {
    const wheelThreshold = 30
    const touchThreshold = 48

    const handleWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) {
        return
      }
      wheelDeltaRef.current += event.deltaY

      if (Math.abs(wheelDeltaRef.current) < wheelThreshold) {
        return
      }

      const direction: TransitionDirection = wheelDeltaRef.current > 0 ? 'next' : 'prev'
      wheelDeltaRef.current = 0
      const handled = navigateWithLock(direction)
      if (handled) {
        event.preventDefault()
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return
      }

      if (event.key === 'ArrowDown' || event.key === 'PageDown' || event.key === ' ') {
        const handled = navigateWithLock('next')
        if (handled) {
          event.preventDefault()
        }
        return
      }

      if (event.key === 'ArrowUp' || event.key === 'PageUp') {
        const handled = navigateWithLock('prev')
        if (handled) {
          event.preventDefault()
        }
      }
    }

    const handleTouchStart = (event: TouchEvent) => {
      // 检查触摸目标是否在可滚动的面板内部
      const target = event.target as HTMLElement
      const scrollablePanel = target.closest('.detail-panel')
      
      // 如果在可滚动面板内，且该面板确实可以滚动，则不记录起始点（放弃外层翻页逻辑）
      if (scrollablePanel && scrollablePanel.scrollHeight > scrollablePanel.clientHeight) {
        touchStartYRef.current = null
        return
      }

      touchStartYRef.current = event.touches[0]?.clientY ?? null
    }

    const handleTouchEnd = (event: TouchEvent) => {
      const startY = touchStartYRef.current
      if (startY === null) {
        return // 在滚动面板内部触发的 touch，被忽略
      }
      
      const endY = event.changedTouches[0]?.clientY
      touchStartYRef.current = null

      if (endY == null) {
        return
      }

      const deltaY = startY - endY
      if (Math.abs(deltaY) < touchThreshold) {
        return
      }

      if (deltaY > 0) {
        navigateWithLock('next')
      } else {
        navigateWithLock('prev')
      }
    }

    window.addEventListener('wheel', handleWheel, { passive: false })
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('touchstart', handleTouchStart, { passive: true })
    window.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      window.removeEventListener('wheel', handleWheel)
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('touchend', handleTouchEnd)
    }
  }, [navigateWithLock])

  const getPanelClass = useCallback(
    (state: HomeState) => {
      const stateIndex = HOME_STATES.indexOf(state)

      if (!isTransitioning || !transitionFromState) {
        if (state === activeState) {
          return 'home-panel--current'
        }
        return stateIndex < activeStateIndex ? 'home-panel--left' : 'home-panel--right'
      }

      if (state === transitionFromState) {
        return transitionDirection === 'next' ? 'home-panel--from-next' : 'home-panel--from-prev'
      }

      if (state === activeState) {
        return transitionDirection === 'next' ? 'home-panel--to-next' : 'home-panel--to-prev'
      }

      return stateIndex < activeStateIndex ? 'home-panel--left' : 'home-panel--right'
    },
    [activeState, activeStateIndex, isTransitioning, transitionDirection, transitionFromState],
  )

  const handlePanelTransitionEnd = useCallback(
    (event: React.TransitionEvent<HTMLDivElement>) => {
      if (!isTransitioning) {
        return
      }
      const target = event.target as HTMLElement
      if (!target.classList.contains('home-panel') || event.propertyName !== 'transform') {
        return
      }
      setIsTransitioning(false)
      setTransitionFromState(null)
    },
    [isTransitioning],
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

    if (hlsRef.current) {
      hlsRef.current.destroy()
      hlsRef.current = null
    }

    videoElement.pause()
    videoElement.removeAttribute('src')
    videoElement.load()

    if (videoMode !== 'hls') {
      videoElement.src = homeAv1VideoSrc
      videoElement.load()
      return
    }

    const canPlayNativeHls = videoElement.canPlayType('application/vnd.apple.mpegurl') !== ''
    if (canPlayNativeHls) {
      videoElement.src = homeHlsVideoSrc
      videoElement.load()
      return
    }

    if (!Hls.isSupported()) {
      setVideoMode('file')
      return
    }

    const hls = new Hls({
      enableWorker: true,
    })

    hlsRef.current = hls
    hls.attachMedia(videoElement)
    hls.on(Hls.Events.MEDIA_ATTACHED, () => {
      hls.loadSource(homeHlsVideoSrc)
    })
    hls.on(Hls.Events.ERROR, (_, data) => {
      if (!data.fatal) {
        return
      }
      hls.destroy()
      hlsRef.current = null
      setVideoMode('file')
    })

    return () => {
      hls.destroy()
      if (hlsRef.current === hls) {
        hlsRef.current = null
      }
    }
  }, [canUseVideo, homeAv1VideoSrc, homeHlsVideoSrc, videoMode])

  useEffect(() => {
    const videoElement = videoRef.current
    if (!videoElement || !canUseVideo) {
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
      videoElement.pause()
      videoElement.currentTime = 0
    }
  }, [canUseVideo, videoMode])

  useEffect(() => {
    const videoElement = videoRef.current
    if (!videoElement || !canUseVideo || !isVideoLoaded) {
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
  }, [canUseVideo, isVideoLoaded])

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
      <ScrollIndicator visible={activeStateIndex < HOME_STATES.length - 1} />

      <div className="home-panels" onTransitionEnd={handlePanelTransitionEnd}>
        <HeroPanel
          panelClass={getPanelClass('hero')}
          quoteText={QUOTE_TEXT}
          typedLength={typedLength}
          canUseVideo={canUseVideo}
          isVideoLoaded={isVideoLoaded}
          isVideoVisible={isVideoVisible}
          imageSrc={homeImageSrc}
          videoSrc={activeVideoSrc}
          videoMimeType={activeVideoMimeType}
          videoRef={videoRef}
          onVideoLoadStart={() => {
            setIsVideoLoaded(false)
            setIsVideoVisible(false)
          }}
        />

        <section className={`home-panel ${getPanelClass('intro')}`} aria-label="home intro panel">
          <Suspense fallback={<div className="home-panel__blank home-panel__blank--intro" />}>
            {renderedPanels.intro ? <IntroPanel /> : null}
          </Suspense>
        </section>

        <section className={`home-panel ${getPanelClass('detail')}`} aria-label="home detail panel">
          <Suspense fallback={<div className="home-panel__blank home-panel__blank--detail" />}>
            {renderedPanels.detail ? <DetailPanel /> : null}
          </Suspense>
        </section>
      </div>

      <SideIndicator 
        currentIndex={activeStateIndex} 
        total={HOME_STATES.length} 
        titles={PANEL_TITLES} 
      />
    </main>
  )
}

export default Home
