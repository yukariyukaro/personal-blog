import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { resolvePublicAsset } from '../../utils/baseUrl'

const STORAGE_KEY = 'blog-music-enabled'
const BGM_SRC = resolvePublicAsset('music/bgm.mp3')
const TARGET_VOLUME = 0.35
const FADE_IN_DURATION = 600
const FADE_OUT_DURATION = 300

type FadeHandle = number | null

// 背景音乐在整站只有一个实例：模块级单例，路由切换时音频连续不中断。
let bgmAudio: HTMLAudioElement | null = null
let fadeHandle: FadeHandle = null

const getAudio = (): HTMLAudioElement => {
  if (!bgmAudio) {
    bgmAudio = new Audio(BGM_SRC)
    bgmAudio.loop = true
    // 点击播放才拉流，避免首屏无谓的 3.8MB 音频请求
    bgmAudio.preload = 'none'
    bgmAudio.volume = 0
  }
  return bgmAudio
}

const cancelFade = () => {
  if (fadeHandle !== null) {
    window.cancelAnimationFrame(fadeHandle)
    fadeHandle = null
  }
}

// 官网手法：音量线性渐变替代硬切，淡入 600ms / 淡出 300ms
const fadeVolume = (
  audio: HTMLAudioElement,
  target: number,
  duration: number,
  onComplete?: () => void,
) => {
  cancelFade()
  const startVolume = audio.volume
  const startTime = performance.now()
  const step = (now: number) => {
    const progress = Math.min((now - startTime) / duration, 1)
    audio.volume = Math.min(
      1,
      Math.max(0, startVolume + (target - startVolume) * progress),
    )
    if (progress < 1) {
      fadeHandle = window.requestAnimationFrame(step)
    } else {
      fadeHandle = null
      onComplete?.()
    }
  }
  fadeHandle = window.requestAnimationFrame(step)
}

const readStoredEnabled = (): boolean => {
  if (typeof window === 'undefined') {
    return false
  }
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'on'
  } catch {
    return false
  }
}

export function useBgmAudio() {
  // isPlaying 不手工赋值，统一由 <audio> 的 play/pause 事件驱动（下方订阅 effect），
  // 手动 toggle 时才乐观写入以便图标即刻响应，失败路径再回滚。
  const [isPlaying, setIsPlaying] = useState(false)
  // enabledRef 记录「用户意图」，isPlaying 反映「真实播放状态」：
  // 图标动画绑定后者，跨会话恢复绑定前者。
  const enabledRef = useRef<boolean>(readStoredEnabled())
  const location = useLocation()
  const isEditorRoute = location.pathname.toLowerCase() === '/editor'
  const wasEditorRef = useRef(isEditorRoute)
  const gestureListenerRef = useRef<((event: MouseEvent) => void) | null>(null)
  const startPlaybackRef = useRef<() => void>(() => {})

  // 订阅外部系统（audio 元素）：程序化路径（编辑器进出、手势起播）的图标状态同步
  useEffect(() => {
    const audio = getAudio()
    const markPlaying = () => setIsPlaying(true)
    const markPaused = () => setIsPlaying(false)
    audio.addEventListener('play', markPlaying)
    audio.addEventListener('pause', markPaused)
    return () => {
      audio.removeEventListener('play', markPlaying)
      audio.removeEventListener('pause', markPaused)
    }
  }, [])

  const clearGestureListener = useCallback(() => {
    if (gestureListenerRef.current) {
      document.removeEventListener('click', gestureListenerRef.current)
      gestureListenerRef.current = null
    }
  }, [])

  // 浏览器自动播放策略下出声必须挂在真实用户手势上：
  // 偏好为开的回访者，进入站点后的第一次点击任意处即开始播放（官网手法）。
  const armGestureListener = useCallback(() => {
    if (gestureListenerRef.current) {
      return
    }
    const handler = (event: MouseEvent) => {
      // 点击其他按钮（如音波开关本身、主题切换）不触发自动起播，
      // 开关有自己的 toggle 流程；监听保留给下一次普通交互。
      if ((event.target as Element | null)?.closest('button')) {
        return
      }
      // 写作台是沉浸式工作台，即使偏好为开也不在编辑器里自动出声
      if (window.location.hash.toLowerCase().startsWith('#/editor')) {
        return
      }
      clearGestureListener()
      startPlaybackRef.current()
    }
    gestureListenerRef.current = handler
    document.addEventListener('click', handler)
  }, [clearGestureListener])

  const startPlayback = useCallback(async () => {
    const audio = getAudio()
    cancelFade()
    audio.volume = 0
    try {
      await audio.play()
    } catch (error) {
      // 无手势上下文（如仅靠路由恢复）：挂回手势监听等下一次交互
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        armGestureListener()
      }
      // 音源不可用等其他错误：静默失败。图标若因乐观写入已亮起，这里回滚
      setIsPlaying(false)
      return
    }
    fadeVolume(audio, TARGET_VOLUME, FADE_IN_DURATION)
  }, [armGestureListener])

  useEffect(() => {
    startPlaybackRef.current = () => {
      void startPlayback()
    }
  }, [startPlayback])

  // 只操作音频本身，不改 React 状态——供 effect 内调用（如进出写作台），
  // 图标状态由 pause 事件同步。
  const pauseAudio = useCallback(() => {
    const audio = getAudio()
    if (audio.paused) {
      cancelFade()
      audio.volume = 0
      return
    }
    fadeVolume(audio, 0, FADE_OUT_DURATION, () => {
      audio.pause()
    })
  }, [])

  const toggle = useCallback(() => {
    const next = !enabledRef.current
    enabledRef.current = next
    try {
      window.localStorage.setItem(STORAGE_KEY, next ? 'on' : 'off')
    } catch {
      // 隐私模式下 localStorage 可能不可写，本次会话内仍生效。
    }
    if (next) {
      // 点击处理器内乐观更新，图标随点击立即变蓝；播放失败时由 startPlayback 回滚
      setIsPlaying(true)
      void startPlayback()
    } else {
      clearGestureListener()
      setIsPlaying(false)
      pauseAudio()
    }
  }, [startPlayback, pauseAudio, clearGestureListener])

  // 恢复回访者偏好：不立即 play（无手势必被拒），改挂手势监听
  useEffect(() => {
    if (enabledRef.current && !wasEditorRef.current) {
      armGestureListener()
    }
    return clearGestureListener
  }, [armGestureListener, clearGestureListener])

  // 写作台为沉浸式工作台：进入时淡出暂停，离开后按用户意图恢复。
  // 两个分支都只调用音频操作函数，图标状态由 play/pause 事件驱动。
  useEffect(() => {
    const enteringEditor = isEditorRoute && !wasEditorRef.current
    const leavingEditor = !isEditorRoute && wasEditorRef.current
    wasEditorRef.current = isEditorRoute
    if (enteringEditor && !getAudio().paused) {
      pauseAudio()
    } else if (leavingEditor && enabledRef.current) {
      startPlaybackRef.current()
    }
  }, [isEditorRoute, pauseAudio])

  return { isPlaying, toggle }
}
