import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { fetchHealth } from './utils/apiClient'

type AppBootstrapProps = {
  children: ReactNode
}

// 关键字体（SmileySans）最长等待时间：超时后即便字体未就绪也展示页面，避免遮罩无限期停留
const FONT_READY_TIMEOUT = 2000

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

    // 等字体就绪再撤掉 Loading，避免首屏先渲染兜底字体、字体到达后再跳变（FOUT）
    void waitForCriticalFont().then(() => {
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
