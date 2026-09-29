import { useCallback, useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import Vditor from 'vditor'
import 'vditor/dist/index.css'
import type { EditorMode, Theme } from './types'
import { createVditorOptions, VditorContentThemePath } from './lib/vditorOptions'

type VditorEditorHandlers = {
  onInput: (value: string) => void
  /** 实例就绪时回调实例，销毁时回调 null，避免外部持有失效引用。 */
  onInstanceChange: (instance: Vditor | null) => void
  onRequestMath: () => void
}

type VditorEditorProps = VditorEditorHandlers & {
  initialValue: string
  mode: EditorMode
  theme: Theme
  /** 需要观察编辑区 DOM 时由外部提供（本地图片注入用）。 */
  hostRef?: RefObject<HTMLDivElement | null>
}

export default function VditorEditor({
  initialValue,
  mode,
  theme,
  hostRef,
  onInput,
  onInstanceChange,
  onRequestMath,
}: VditorEditorProps) {
  const internalRef = useRef<HTMLDivElement | null>(null)
  const instanceRef = useRef<Vditor | null>(null)
  const valueRef = useRef(initialValue)
  const themeRef = useRef(theme)
  const handlersRef = useRef<VditorEditorHandlers>({
    onInput,
    onInstanceChange,
    onRequestMath,
  })

  // 宿主节点同时写入内部 ref 与外部 ref：外部需要观察编辑区 DOM（本地图片注入）。
  const attachHost = useCallback(
    (node: HTMLDivElement | null) => {
      internalRef.current = node
      if (hostRef) {
        hostRef.current = node
      }
    },
    [hostRef],
  )

  useEffect(() => {
    handlersRef.current = { onInput, onInstanceChange, onRequestMath }
  }, [onInput, onInstanceChange, onRequestMath])

  // Vditor 4 没有 setMode，切换模式只能重建实例；重建前先把内容存回 valueRef。
  useEffect(() => {
    const host = internalRef.current
    if (!host) {
      return
    }

    let disposed = false
    let instance: Vditor | null = null

    // 每次创建都用独立挂载点：StrictMode 双调用时，上一轮被丢弃的实例
    // 即使异步完成初始化，也只会写进已被移除的节点，不会污染新实例。
    const mount = document.createElement('div')
    mount.className = 'md-vditor-mount'
    mount.style.height = '100%'
    host.replaceChildren(mount)

    instance = new Vditor(mount, {
      ...createVditorOptions({
        mode,
        theme: themeRef.current,
        value: valueRef.current,
        onInput: (value) => {
          valueRef.current = value
          handlersRef.current.onInput(value)
        },
        onRequestMath: () => handlersRef.current.onRequestMath(),
      }),
      after: () => {
        if (disposed) {
          try {
            instance?.destroy()
          } catch {
            // 被丢弃的实例可能已处于不可销毁状态。
          }
          return
        }
        instanceRef.current = instance
        handlersRef.current.onInstanceChange(instance as Vditor)
      },
    })

    return () => {
      disposed = true
      const readyInstance = instanceRef.current
      instanceRef.current = null
      // 先告知外部实例已失效，再做销毁，避免后续对死实例调用 setValue。
      handlersRef.current.onInstanceChange(null)

      if (readyInstance) {
        try {
          valueRef.current = readyInstance.getValue()
        } catch {
          // 读取失败时保留上一个已知内容。
        }

        try {
          readyInstance.destroy()
        } catch {
          // 实例可能已不可销毁，忽略即可。
        }
      }

      mount.remove()
      host.replaceChildren()
    }
  }, [mode])

  useEffect(() => {
    themeRef.current = theme
    const instance = instanceRef.current
    if (!instance) {
      return
    }

    instance.setTheme(
      theme === 'light' ? 'classic' : 'dark',
      theme === 'light' ? 'light' : 'dark',
      theme === 'light' ? 'github' : 'github-dark',
      VditorContentThemePath,
    )
  }, [theme])

  return <div className="md-vditor-host" ref={attachHost} />
}
