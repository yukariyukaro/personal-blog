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

type TimerHandle = ReturnType<typeof globalThis.setTimeout>

export type Live2DTimeoutScheduler = {
  setTimeout: (callback: () => void, timeoutMs: number) => TimerHandle
  clearTimeout: (handle: TimerHandle) => void
}

const LIVE2D_WIDGET_SCRIPT_URL =
  'https://cdn.jsdelivr.net/npm/l2d-widget@0.1.2/dist/index.min.js'
const LIVE2D_WIDGET_SCRIPT_INTEGRITY =
  'sha384-dknqoOM7eR2i1au1iXdwuzkYibjVLkiSOVrqdgJcxGIymJnbLbh8RiLgb6IcLJur'
export const LIVE2D_SCRIPT_TIMEOUT_MS = 10_000
export const LIVE2D_MODEL_TIMEOUT_MS = 15_000

const defaultScheduler: Live2DTimeoutScheduler = {
  setTimeout: (callback, timeoutMs) =>
    globalThis.setTimeout(callback, timeoutMs),
  clearTimeout: (handle) => globalThis.clearTimeout(handle),
}

export const withTimeout = <Value>(
  operation: PromiseLike<Value>,
  timeoutMs: number,
  message: string,
  onTimeout: () => void | Promise<void> = () => {},
  scheduler: Live2DTimeoutScheduler = defaultScheduler,
) =>
  new Promise<Value>((resolve, reject) => {
    let settled = false
    const timeout = scheduler.setTimeout(() => {
      if (settled) {
        return
      }

      settled = true
      void Promise.resolve()
        .then(onTimeout)
        .catch(() => undefined)
        .then(() => reject(new Error(message)))
    }, timeoutMs)

    Promise.resolve(operation).then(
      (value) => {
        if (settled) {
          return
        }
        settled = true
        scheduler.clearTimeout(timeout)
        resolve(value)
      },
      (error: unknown) => {
        if (settled) {
          return
        }
        settled = true
        scheduler.clearTimeout(timeout)
        reject(error)
      },
    )
  })

declare global {
  interface Window {
    L2D_WIDGET?: Live2DWidgetApi
  }
}

let scriptPromise: Promise<Live2DWidgetApi> | null = null
const destroyedWidgets = new WeakSet<Live2DWidgetInstance>()

export const destroyLive2DWidget = async (
  widget: Live2DWidgetInstance | null,
) => {
  if (!widget || destroyedWidgets.has(widget)) {
    return
  }

  destroyedWidgets.add(widget)
  try {
    await widget.destroy()
  } catch {
    return
  }
}

export const waitForLive2DModel = (
  widget: Live2DWidgetInstance,
  timeoutMs = LIVE2D_MODEL_TIMEOUT_MS,
  scheduler: Live2DTimeoutScheduler = defaultScheduler,
) =>
  withTimeout(
    new Promise<void>((resolve) => {
      widget.l2d.on('loaded', resolve)
    }),
    timeoutMs,
    'Live2D 模型加载超时',
    () => destroyLive2DWidget(widget),
    scheduler,
  )

export const startLive2DLoadAttempt = async <Value>(
  previousWidget: Live2DWidgetInstance | null,
  load: () => Promise<Value>,
) => {
  await destroyLive2DWidget(previousWidget)
  return load()
}

export const loadLive2DWidget = (
  timeoutMs = LIVE2D_SCRIPT_TIMEOUT_MS,
  scheduler: Live2DTimeoutScheduler = defaultScheduler,
) => {
  if (window.L2D_WIDGET) {
    return Promise.resolve(window.L2D_WIDGET)
  }

  if (scriptPromise) {
    return scriptPromise
  }

  let cleanupScript = () => {}
  scriptPromise = new Promise<Live2DWidgetApi>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-live2d-widget]',
    )
    const script = existing ?? document.createElement('script')
    const cleanupListeners = () => {
      script.removeEventListener('load', handleLoad)
      script.removeEventListener('error', handleError)
    }
    cleanupScript = cleanupListeners

    const handleLoad = () => {
      cleanupListeners()
      if (window.L2D_WIDGET) {
        script.dataset.live2dWidgetState = 'loaded'
        resolve(window.L2D_WIDGET)
        return
      }
      script.remove()
      reject(new Error('Live2D 脚本未暴露初始化接口'))
    }

    const handleError = () => {
      cleanupListeners()
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
  })

  const pendingScript = scriptPromise
  scriptPromise = withTimeout(
    pendingScript,
    timeoutMs,
    'Live2D 脚本加载超时',
    () => {
      cleanupScript()
      document
        .querySelector<HTMLScriptElement>('script[data-live2d-widget]')
        ?.remove()
    },
    scheduler,
  ).catch((error: unknown) => {
    scriptPromise = null
    throw error
  })

  return scriptPromise
}
