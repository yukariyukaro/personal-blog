import { resolvePublicAsset } from '../../../utils/baseUrl'

/**
 * 首屏 Hero 的三份媒体资源。resolvePublicAsset 只读构建期常量（import.meta.env.DEV），
 * 结果在整个生命周期内不变，因此用模块级常量而不是 useMemo。
 */
export const HERO_IMAGE_SRC = resolvePublicAsset('home/home.webp')
export const HERO_HLS_MANIFEST_SRC = resolvePublicAsset('home/hls/index.m3u8')
export const HERO_FALLBACK_VIDEO_SRC = resolvePublicAsset('home/home-vp9.webm')

/** Network Information API 的可用字段；该 API 尚未标准化，需按可选处理。 */
export type NetworkInformationLike = {
  saveData?: boolean
  effectiveType?: string
}

export type HeroVideoConditions = {
  reducedMotion: boolean
  saveData: boolean
  effectiveType: string
}

const SLOW_EFFECTIVE_TYPES = new Set(['slow-2g', '2g', '3g'])

export const isSlowNetwork = (effectiveType: string) =>
  SLOW_EFFECTIVE_TYPES.has(effectiveType)

/**
 * 是否值得加载首屏视频。三者任一命中即降级到静态图：
 * 用户要求减弱动效、开启省流、或当前网络判定为慢速。
 */
export const shouldLoadHeroVideo = ({
  reducedMotion,
  saveData,
  effectiveType,
}: HeroVideoConditions) =>
  !reducedMotion && !saveData && !isSlowNetwork(effectiveType)
