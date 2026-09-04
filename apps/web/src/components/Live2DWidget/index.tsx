import { useEffect, useRef, useState } from 'react'
import { BASE_URL } from '../../utils/baseUrl'
import {
  loadLive2DWidget,
  type Live2DWidgetInstance,
} from './loadLive2DWidget'
import './Live2DWidget.css'

const STORAGE_KEY = 'blog-live2d-enabled'
const MOBILE_BREAKPOINT = 768
type Live2DLoadState = 'idle' | 'loading' | 'loaded' | 'failed'

const setWidgetLayer = (widget: Live2DWidgetInstance) => {
  const canvas = widget.l2d.getCanvas()
  const widgetRoot = canvas.parentElement
  if (widgetRoot) {
    widgetRoot.style.zIndex = '28'
  }

  const controlRoot = Array.from(document.body.children).find(
    (element) =>
      element !== widgetRoot &&
      element.querySelector('span[style*="vertical-rl"]'),
  )
  if (controlRoot instanceof HTMLElement) {
    controlRoot.style.zIndex = '27'
  }
}

const readEnabledState = () => {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

export default function Live2DWidget() {
  const widgetRef = useRef<Live2DWidgetInstance | null>(null)
  const [enabled, setEnabled] = useState(readEnabledState)
  const [loadState, setLoadState] = useState<Live2DLoadState>('loading')
  const [isMobile, setIsMobile] = useState(
    () => window.innerWidth <= MOBILE_BREAKPOINT,
  )

  useEffect(() => {
    const updateViewport = () => {
      setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT)
    }
    window.addEventListener('resize', updateViewport)
    return () => window.removeEventListener('resize', updateViewport)
  }, [])

  useEffect(() => {
    if (!enabled || isMobile) {
      return
    }

    let isActive = true
    let widget: Live2DWidgetInstance | null = null

    void loadLive2DWidget()
      .then((api) => {
        if (!isActive) {
          return
        }

        widget = api.createWidget({
          model: {
            path: `${BASE_URL}pio/models/NOIR/noir.model3.json`,
          },
          position: 'bottom-left',
          size: 250,
          transitionDuration: 900,
          transitionType: 'slide',
          _hideAbout: true,
          menus: {
            items: [
              {
                icon: 'mdi:home-outline',
                label: '返回首页',
                onClick: () => window.scrollTo({ top: 0, behavior: 'smooth' }),
              },
              {
                icon: 'mdi:bed-outline',
                label: '休眠',
                onClick: (instance) => instance.sleep(),
              },
            ],
          },
        })
        widgetRef.current = widget
        setWidgetLayer(widget)
        widget.l2d.on('loaded', () => {
          if (isActive) {
            setLoadState('loaded')
          }
        })
      })
      .catch((error: unknown) => {
        if (isActive) {
          setLoadState('failed')
        }
        console.error('Live2D 加载失败：', error)
      })

    return () => {
      isActive = false
      if (widgetRef.current === widget) {
        widgetRef.current = null
      }
      if (widget) {
        void Promise.resolve(widget.destroy()).catch(() => {})
      }
    }
  }, [enabled, isMobile])

  const setWidgetEnabled = (nextEnabled: boolean) => {
    setEnabled(nextEnabled)
    setLoadState(nextEnabled ? 'loading' : 'idle')
    try {
      window.localStorage.setItem(STORAGE_KEY, String(nextEnabled))
    } catch {
      // 隐私模式下无法持久化时，当前会话仍然支持切换。
    }
  }

  if (isMobile) {
    return null
  }

  if (!enabled) {
    return (
      <button
        className="live2d-toggle"
        type="button"
        aria-label="开启 Live2D 看板娘"
        title="开启 Live2D 看板娘"
        onClick={() => setWidgetEnabled(true)}
      >
        <span aria-hidden="true">✦</span>
      </button>
    )
  }

  return (
    <div
      className={`live2d-widget ${loadState === 'loaded' ? 'is-loaded' : ''}`}
      data-load-state={loadState}
      aria-busy={loadState === 'loading'}
    >
      <div
        className="live2d-widget__loading"
        aria-hidden={loadState !== 'loading'}
      >
        <span>LIVE2D</span>
      </div>
      <button
        className="live2d-widget__close"
        type="button"
        aria-label="关闭 Live2D 看板娘"
        title="关闭 Live2D 看板娘"
        onClick={() => setWidgetEnabled(false)}
      >
        ×
      </button>
    </div>
  )
}
