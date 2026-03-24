import { useEffect } from 'react'
import type { ReactNode } from 'react'

type AppBootstrapProps = {
  children: ReactNode
}

function AppBootstrap({ children }: AppBootstrapProps) {
  useEffect(() => {
    const loadingEl = document.getElementById('global-loading')
    if (!loadingEl) {
      return
    }
    const timer = window.setTimeout(() => {
      loadingEl.classList.add('is-hidden')
      window.setTimeout(() => {
        loadingEl.remove()
      }, 500)
    }, 300)
    return () => window.clearTimeout(timer)
  }, [])

  return <>{children}</>
}

export default AppBootstrap
