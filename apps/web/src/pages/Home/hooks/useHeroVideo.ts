import { useEffect, useState } from 'react'
import {
  shouldLoadHeroVideo,
  type NetworkInformationLike,
} from '../utils/heroMedia'

type NavigatorWithConnection = Navigator & {
  connection?: NetworkInformationLike
}

/**
 * 首屏视频可用性：减弱动效 / 省流 / 慢网时返回 false，调用方据此降级到静态图。
 * 判定规则本身是纯函数，见 utils/heroMedia.ts。
 */
export function useHeroVideo() {
  const [isVideoEnabled, setIsVideoEnabled] = useState(true)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const connection = (navigator as NavigatorWithConnection)?.connection

    const updateVideoAvailability = () => {
      setIsVideoEnabled(
        shouldLoadHeroVideo({
          reducedMotion: mediaQuery.matches,
          saveData: Boolean(connection?.saveData),
          effectiveType: connection?.effectiveType ?? '',
        }),
      )
    }

    updateVideoAvailability()
    mediaQuery.addEventListener('change', updateVideoAvailability)
    return () => {
      mediaQuery.removeEventListener('change', updateVideoAvailability)
    }
  }, [])

  return isVideoEnabled
}
