export type Live2DWidgetInstance = {
  destroy: () => void | Promise<void>
  l2d: {
    getCanvas: () => HTMLCanvasElement
    on: (event: 'loaded', listener: () => void) => void
  }
  sleep: () => void
}

export type Live2DWidgetConfig = {
  model: {
    path: string
  }
  position: 'bottom-left' | 'bottom-right'
  size: number
  transitionDuration: number
  transitionType: 'slide' | 'fade'
  _hideAbout: boolean
  menus: {
    items: Array<{
      icon: string
      label: string
      onClick: (widget: Live2DWidgetInstance) => void
    }>
  }
}

type Live2DWidgetApi = {
  createWidget: (config: Live2DWidgetConfig) => Live2DWidgetInstance
}

const LIVE2D_WIDGET_SCRIPT_URL =
  'https://cdn.jsdelivr.net/npm/l2d-widget@0.1.2/dist/index.min.js'
const LIVE2D_WIDGET_SCRIPT_INTEGRITY =
  'sha384-dknqoOM7eR2i1au1iXdwuzkYibjVLkiSOVrqdgJcxGIymJnbLbh8RiLgb6IcLJur'

declare global {
  interface Window {
    L2D_WIDGET?: Live2DWidgetApi
  }
}

let scriptPromise: Promise<Live2DWidgetApi> | null = null

export const loadLive2DWidget = () => {
  if (window.L2D_WIDGET) {
    return Promise.resolve(window.L2D_WIDGET)
  }

  if (scriptPromise) {
    return scriptPromise
  }

  scriptPromise = new Promise<Live2DWidgetApi>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-live2d-widget]',
    )
    const script = existing ?? document.createElement('script')

    const handleLoad = () => {
      if (window.L2D_WIDGET) {
        script.dataset.live2dWidgetState = 'loaded'
        resolve(window.L2D_WIDGET)
        return
      }
      script.remove()
      reject(new Error('Live2D 脚本未暴露初始化接口'))
    }

    const handleError = () => {
      script.remove()
      reject(new Error('Live2D 脚本加载失败'))
    }

    script.addEventListener('load', handleLoad, { once: true })
    script.addEventListener('error', handleError, { once: true })

    if (!existing) {
      script.async = true
      script.crossOrigin = 'anonymous'
      script.integrity = LIVE2D_WIDGET_SCRIPT_INTEGRITY
      script.referrerPolicy = 'no-referrer'
      script.src = LIVE2D_WIDGET_SCRIPT_URL
      script.dataset.live2dWidget = 'true'
      document.head.appendChild(script)
    } else if (existing.dataset.live2dWidgetState === 'loaded') {
      handleLoad()
    }
  }).catch((error: unknown) => {
    scriptPromise = null
    throw error
  })

  return scriptPromise
}
