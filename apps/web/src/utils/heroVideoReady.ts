// 首屏视频就绪信号：HeroPanel 视频可播放（或确认走图片降级）时广播，
// AppBootstrap 收到后才撤除全局 Loading，保证「揭开即视频」。
const HERO_VIDEO_READY_EVENT = 'home:hero-video-ready'

type WindowWithHeroVideoFlag = Window & { __heroVideoReady?: boolean }

export function markHeroVideoReady() {
  const win = window as WindowWithHeroVideoFlag
  if (win.__heroVideoReady) {
    return
  }
  win.__heroVideoReady = true
  window.dispatchEvent(new CustomEvent(HERO_VIDEO_READY_EVENT))
}

/**
 * 等待首屏视频就绪；已就绪（或判定不会出现视频）时立即返回。
 * isVideoExpected 用于非首页初始路由：此时没有 Hero 视频可等，直接放行。
 */
export function waitForHeroVideoReady(
  timeoutMs: number,
  isVideoExpected: () => boolean,
): Promise<void> {
  const win = window as WindowWithHeroVideoFlag
  if (win.__heroVideoReady || !isVideoExpected()) {
    return Promise.resolve()
  }

  return new Promise((resolve) => {
    let isSettled = false
    const finish = () => {
      if (isSettled) {
        return
      }
      isSettled = true
      window.removeEventListener(HERO_VIDEO_READY_EVENT, finish)
      window.clearTimeout(timeoutId)
      resolve()
    }

    const timeoutId = window.setTimeout(finish, timeoutMs)
    window.addEventListener(HERO_VIDEO_READY_EVENT, finish, { once: true })
  })
}
