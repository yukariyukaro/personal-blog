import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { resolvePublicAsset } from '../../utils/baseUrl'
import { useOutletContext } from 'react-router-dom'
import type { AppContextType } from '../../App'
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
  const touchStartYRef = useRef<number | null>(null)
  const wheelDeltaRef = useRef(0)
  const interactionLockUntilRef = useRef(0)
  const introImportPromiseRef = useRef<Promise<unknown> | null>(null)
  const detailImportPromiseRef = useRef<Promise<unknown> | null>(null)
  const introAssetsPromiseRef = useRef<Promise<void> | null>(null)
  const detailAssetsPromiseRef = useRef<Promise<void> | null>(null)
  const [isVideoEnabled, setIsVideoEnabled] = useState(true)
  
  // Use internal state synced with external
  const [activeState, setActiveState] = useState<HomeState>(HOME_STATES[externalActiveIndex] || 'hero')
  const [transitionFromState, setTransitionFromState] = useState<HomeState | null>(null)
  const [transitionDirection, setTransitionDirection] = useState<TransitionDirection>('next')
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [renderedPanels, setRenderedPanels] = useState({
    intro: externalActiveIndex >= 1,
    detail: externalActiveIndex >= 2,
  })
  const [panelReady, setPanelReady] = useState({
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

  const canUseVideo = useMemo(() => isVideoEnabled, [isVideoEnabled])
  const homeImageSrc = useMemo(() => resolvePublicAsset('home/home.webp'), [])
  const homeHlsManifestSrc = useMemo(() => resolvePublicAsset('home/hls/index.m3u8'), [])
  const homeAv1VideoSrc = useMemo(() => resolvePublicAsset('home/home_av1.webm'), [])
  const introFallbackBg = useMemo(() => resolvePublicAsset('information/background.webp'), [])
  const detailFallbackBg = useMemo(() => resolvePublicAsset('home/home.webp'), [])

  const prefetchImageAsset = useCallback((url: string) => {
    const image = new Image()
    image.decoding = 'async'
    image.loading = 'eager'
    image.fetchPriority = 'low'
    return new Promise<void>((resolve) => {
      image.onload = () => resolve()
      image.onerror = () => resolve()
      image.src = url
    })
  }, [])

  const prefetchAssetsWithConcurrency = useCallback(
    async (urls: string[], concurrency = 2) => {
      const uniqueUrls = Array.from(new Set(urls))
      if (uniqueUrls.length === 0) {
        return
      }
      let cursor = 0
      const worker = async () => {
        while (cursor < uniqueUrls.length) {
          const currentIndex = cursor
          cursor += 1
          await prefetchImageAsset(uniqueUrls[currentIndex])
        }
      }
      await Promise.all(
        Array.from({ length: Math.min(concurrency, uniqueUrls.length) }, () => worker()),
      )
    },
    [prefetchImageAsset],
  )

  const preloadIntroAssets = useCallback(() => {
    if (!introAssetsPromiseRef.current) {
      introAssetsPromiseRef.current = prefetchAssetsWithConcurrency(
        [resolvePublicAsset('information/background.webp')],
        1,
      )
    }
    return introAssetsPromiseRef.current
  }, [prefetchAssetsWithConcurrency])

  const preloadDetailAssets = useCallback(() => {
    if (!detailAssetsPromiseRef.current) {
      detailAssetsPromiseRef.current = prefetchAssetsWithConcurrency(
        [
          resolvePublicAsset('Detail/TripleUni.webp'),
          resolvePublicAsset('Detail/YearReport.webp'),
          resolvePublicAsset('home/home.webp'),
          resolvePublicAsset('information/background.webp'),
        ],
        2,
      )
    }
    return detailAssetsPromiseRef.current
  }, [prefetchAssetsWithConcurrency])

  const preloadIntroPanel = useCallback(() => {
    if (!introImportPromiseRef.current) {
      introImportPromiseRef.current = import('../../components/HomePanels/IntroPanel')
    }
    return introImportPromiseRef.current
  }, [])

  const preloadDetailPanel = useCallback(() => {
    if (!detailImportPromiseRef.current) {
      detailImportPromiseRef.current = import('../../components/HomePanels/DetailPanel')
    }
    return detailImportPromiseRef.current
  }, [])

  const ensureIntroReady = useCallback(async () => {
    await Promise.all([preloadIntroPanel(), preloadIntroAssets()])
    setPanelReady((prev) => (prev.intro ? prev : { ...prev, intro: true }))
    setRenderedPanels((prev) => (prev.intro ? prev : { ...prev, intro: true }))
  }, [preloadIntroAssets, preloadIntroPanel])

  const ensureDetailReady = useCallback(async () => {
    await Promise.all([preloadDetailPanel(), preloadDetailAssets()])
    setPanelReady((prev) => (prev.detail ? prev : { ...prev, intro: true, detail: true }))
    setRenderedPanels((prev) => (prev.detail ? prev : { ...prev, intro: true, detail: true }))
  }, [preloadDetailAssets, preloadDetailPanel])

  useEffect(() => {
    const win = window as Window & {
      requestIdleCallback?: (callback: IdleRequestCallback) => number
      cancelIdleCallback?: (handle: number) => void
    }

    if (win.requestIdleCallback) {
      const idleId = win.requestIdleCallback(() => {
        void ensureIntroReady()
        window.setTimeout(() => {
          void ensureDetailReady()
        }, 350)
      })
      return () => {
        if (win.cancelIdleCallback) {
          win.cancelIdleCallback(idleId)
        }
      }
    }

    const timer = window.setTimeout(() => {
      void ensureIntroReady()
      window.setTimeout(() => {
        void ensureDetailReady()
      }, 450)
    }, 700)
    return () => {
      window.clearTimeout(timer)
    }
  }, [ensureDetailReady, ensureIntroReady])

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

  // Sync external state to internal (when navbar is clicked)
  useEffect(() => {
    if (externalActiveIndex !== activeStateIndex) {
      const targetState = HOME_STATES[externalActiveIndex]
      if (targetState) {
        if (targetState === 'intro' && !panelReady.intro) {
          void ensureIntroReady()
          return
        }
        if (targetState === 'detail' && !panelReady.detail) {
          void ensureDetailReady()
          return
        }
        transitionToState(targetState)
      }
    }
  }, [activeStateIndex, ensureDetailReady, ensureIntroReady, externalActiveIndex, panelReady.detail, panelReady.intro, transitionToState]) // Only listen to external index changes here

  const goNext = useCallback(() => {
    if (activeStateIndex >= HOME_STATES.length - 1) {
      return false
    }
    const nextState = HOME_STATES[activeStateIndex + 1]
    if (nextState === 'intro') {
      if (!panelReady.intro) {
        void ensureIntroReady()
        return false
      }
    }
    if (nextState === 'detail') {
      if (!panelReady.detail) {
        void ensureDetailReady()
        return false
      }
    }
    return transitionToState(nextState)
  }, [activeStateIndex, ensureDetailReady, ensureIntroReady, panelReady.detail, panelReady.intro, transitionToState])

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
      void ensureDetailReady()
    }
  }, [activeState, ensureDetailReady])

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
          imageSrc={homeImageSrc}
          hlsManifestSrc={homeHlsManifestSrc}
          fallbackVideoSrc={homeAv1VideoSrc}
        />

        <section className={`home-panel ${getPanelClass('intro')}`} aria-label="home intro panel">
          <Suspense
            fallback={
              <div
                className="home-panel__blank home-panel__blank--intro"
                style={{
                  backgroundImage: `linear-gradient(130deg, rgba(10, 10, 10, 0.88) 0%, rgba(17, 17, 17, 0.78) 55%, rgba(10, 10, 10, 0.9) 100%), url(${introFallbackBg})`,
                }}
              />
            }
          >
            {renderedPanels.intro ? <IntroPanel /> : null}
          </Suspense>
        </section>

        <section className={`home-panel ${getPanelClass('detail')}`} aria-label="home detail panel">
          <Suspense
            fallback={
              <div
                className="home-panel__blank home-panel__blank--detail"
                style={{
                  backgroundImage: `linear-gradient(125deg, rgba(4, 4, 4, 0.9) 0%, rgba(11, 11, 11, 0.78) 50%, rgba(3, 3, 3, 0.9) 100%), url(${detailFallbackBg})`,
                }}
              />
            }
          >
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
