import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { fetchHealth } from './utils/apiClient'
import { waitForHeroVideoReady } from './utils/heroVideoReady'

type AppBootstrapProps = {
  children: ReactNode
}

// 关键字体（SmileySans）最长等待时间：超时后即便字体未就绪也继续，避免遮罩无限期停留
const FONT_READY_TIMEOUT = 2000
// 首屏视频最长等待时间：超时后放弃等待直接揭开（静态图降级已就位），弱网用户不至于卡在 Loading
const HERO_VIDEO_READY_TIMEOUT = 6000

const waitForCriticalFont = () => {
  if (typeof document === 'undefined' || !('fonts' in document)) {
    return Promise.resolve()
  }

  return Promise.race([
    document.fonts.load('1rem SmileySans').catch(() => undefined),
    new Promise<void>((resolve) => {
      window.setTimeout(resolve, FONT_READY_TIMEOUT)
    }),
  ]).then(() => undefined)
}

// 非首页初始路由（文章/介绍/作品/写作台）没有首屏视频可等，直接放行
const isHeroVideoExpected = () =>
  !/^#\/(post|information|portfolio|editor)/i.test(window.location.hash)

function AppBootstrap({ children }: AppBootstrapProps) {
  useEffect(() => {
    if (import.meta.env.VITE_HEALTHCHECK_URL) {
      void fetchHealth()
    }
  }, [])

  useEffect(() => {
    const loadingEl = document.getElementById('global-loading')
    if (!loadingEl) {
      return
    }

    let isCancelled = false
    let removalTimer = 0

    // 字体与首屏视频都就绪后再撤 Loading：揭开后直接是可播放的视频，
    // 不再有「黑屏等视频」的空窗（视频就绪/降级由 HeroPanel 广播）
    void Promise.all([
      waitForCriticalFont(),
      waitForHeroVideoReady(HERO_VIDEO_READY_TIMEOUT, isHeroVideoExpected),
    ]).then(() => {
      if (isCancelled) {
        return
      }
      loadingEl.classList.add('is-hidden')
      removalTimer = window.setTimeout(() => {
        loadingEl.remove()
      }, 500)
    })

    return () => {
      isCancelled = true
      window.clearTimeout(removalTimer)
    }
  }, [])

  return <>{children}</>
}

export default AppBootstrap
