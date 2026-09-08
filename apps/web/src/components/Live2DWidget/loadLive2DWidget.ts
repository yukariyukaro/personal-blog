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

declare global {
  interface Window {
    L2D_WIDGET?: Live2DWidgetApi
  }
}

let scriptPromise: Promise<Live2DWidgetApi> | null = null

export const loadLive2DWidget = (src: string) => {
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
        resolve(window.L2D_WIDGET)
        return
      }
      reject(new Error('Live2D 脚本未暴露初始化接口'))
    }

    script.addEventListener('load', handleLoad, { once: true })
    script.addEventListener('error', () => reject(new Error('Live2D 脚本加载失败')), {
      once: true,
    })

    if (!existing) {
      script.async = true
      script.src = src
      script.dataset.live2dWidget = 'true'
      document.head.appendChild(script)
    }
  }).catch((error: unknown) => {
    scriptPromise = null
    throw error
  })

  return scriptPromise
}
