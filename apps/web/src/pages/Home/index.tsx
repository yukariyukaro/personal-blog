import { useEffect, useMemo, useRef, useState } from 'react'
import HeroPanel from '../../components/HomePanels/HeroPanel'
import ScrollIndicator from '../../components/ScrollIndicator'
import { resolvePublicAsset } from '../../utils/baseUrl'
import HomePageWave from './HomePageWave'
import { useHomeDescent } from '../../components/HomePanels/useHomeDescent'
import ArticleList from '../../components/Blog/ArticleList'
import './HomePage.css'
import './HomeArchive.css'

const QUOTE_TEXT = '在我发现了自己的谬误后，我的确不再贪婪'

type NetworkInformationLike = {
  saveData?: boolean
  effectiveType?: string
}

type NavigatorWithConnection = Navigator & {
  connection?: NetworkInformationLike
}

function Home() {
  const homePageRef = useRef<HTMLElement | null>(null)
  useHomeDescent(homePageRef)
  const articleSectionRef = useRef<HTMLDivElement | null>(null)
  const [isVideoEnabled, setIsVideoEnabled] = useState(true)
  const [isScrollPromptVisible, setIsScrollPromptVisible] = useState(true)
  const [typedLength, setTypedLength] = useState(() =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ? QUOTE_TEXT.length : 0,
  )
  const homeImageSrc = useMemo(() => resolvePublicAsset('home/home.webp'), [])
  const homeHlsManifestSrc = useMemo(() => resolvePublicAsset('home/hls/index.m3u8'), [])
  const homeFallbackVideoSrc = useMemo(() => resolvePublicAsset('home/home-vp9.webm'), [])

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const connection = (navigator as NavigatorWithConnection).connection
    const updateVideoAvailability = () => {
      const effectiveType = connection?.effectiveType ?? ''
      const isSlowNetwork =
        effectiveType === 'slow-2g' ||
        effectiveType === '2g' ||
        effectiveType === '3g'

      setIsVideoEnabled(
        !mediaQuery.matches &&
          !connection?.saveData &&
          !isSlowNetwork,
      )
    }

    updateVideoAvailability()
    mediaQuery.addEventListener('change', updateVideoAvailability)
    return () => {
      mediaQuery.removeEventListener('change', updateVideoAvailability)
    }
  }, [])

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return
    }

    const totalDuration = 3500
    const delayDuration = 2000
    const stepDuration = totalDuration / QUOTE_TEXT.length
    let intervalId = 0

    const timeoutId = window.setTimeout(() => {
      let current = 0
      intervalId = window.setInterval(() => {
        current += 1
        setTypedLength(current)
        if (current >= QUOTE_TEXT.length) {
          window.clearInterval(intervalId)
        }
      }, stepDuration)
    }, delayDuration)

    return () => {
      window.clearTimeout(timeoutId)
      window.clearInterval(intervalId)
    }
  }, [])

  useEffect(() => {
    let animationFrameId = 0
    // 记录上一次写入 React 的阈值状态：仅在布尔值翻转时更新，
    // 避免滚动时每帧都调度一次 React 更新
    let isPromptVisibleNow = true

    const updateScrollPrompt = () => {
      animationFrameId = 0
      const nextVisible = window.scrollY < window.innerHeight * 0.35
      if (nextVisible === isPromptVisibleNow) {
        return
      }
      isPromptVisibleNow = nextVisible
      setIsScrollPromptVisible(nextVisible)
    }

    const handleScroll = () => {
      if (animationFrameId === 0) {
        animationFrameId = window.requestAnimationFrame(updateScrollPrompt)
      }
    }

    updateScrollPrompt()
    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleScroll)

    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleScroll)
      if (animationFrameId !== 0) {
        window.cancelAnimationFrame(animationFrameId)
      }
    }
  }, [])

  const scrollToArticles = () => {
    articleSectionRef.current?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'auto'
        : 'smooth',
      block: 'start',
    })
  }

  return (
    <main className="home-page" ref={homePageRef}>
      <div className="home-page__runway">
        <div className="home-page__sticky">
          <div className="home-page__hero">
            <HeroPanel
              panelClass="home-panel--current"
              quoteText={QUOTE_TEXT}
              typedLength={typedLength}
              canUseVideo={isVideoEnabled}
              imageSrc={homeImageSrc}
              hlsManifestSrc={homeHlsManifestSrc}
              fallbackVideoSrc={homeFallbackVideoSrc}
            />
            <div className="home-page__dim" aria-hidden="true" />
            <div className="home-page__veil" aria-hidden="true" />
            <HomePageWave />
            <ScrollIndicator
              visible={isScrollPromptVisible}
              onActivate={scrollToArticles}
            />
          </div>
        </div>
      </div>

      <div className="home-page__articles" ref={articleSectionRef}>
        <header className="home-archive-heading">
          <div className="home-archive-heading__code"><span>01</span> / KNOWLEDGE ARCHIVE</div>
          <div className="home-archive-heading__row">
            <p className="home-archive-heading__title">NOTES <span>&</span><br />THOUGHTS<span className="home-archive-heading__period">.</span></p>
            <p className="home-archive-heading__caption">把好奇写成记录。<br /><span>代码、思考，以及未完成的探索。</span></p>
          </div>
          <div className="home-archive-heading__rule" aria-hidden="true"><span>LOUSUSAN / FIELD NOTES</span><span>↓</span></div>
        </header>
        <ArticleList />
      </div>
    </main>
  )
}

export default Home
