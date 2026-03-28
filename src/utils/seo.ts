/**
 * SEO 工具函数
 * 用于动态更新页面 meta 标签
 */

type SEOConfig = {
  title?: string
  description?: string
  keywords?: string
  ogImage?: string
}

const DEFAULT_SEO: SEOConfig = {
  title: '少女吃葱中 | 个人博客',
  description: '初音未来主题个人博客，二次元游戏官网风格。高质量图片与视频，渐进式加载体验。',
  keywords: '初音未来,Miku,个人博客,二次元,ACG,少女吃葱中',
  ogImage: '/home/home.webp',
}

/**
 * 更新页面的 SEO meta 标签
 */
export function updateSEO(config: SEOConfig = {}) {
  const finalConfig = { ...DEFAULT_SEO, ...config }

  // 更新 title
  if (finalConfig.title) {
    document.title = finalConfig.title
    updateMetaTag('og:title', finalConfig.title)
    updateMetaTag('twitter:title', finalConfig.title)
  }

  // 更新 description
  if (finalConfig.description) {
    updateMetaTag('description', finalConfig.description)
    updateMetaTag('og:description', finalConfig.description)
    updateMetaTag('twitter:description', finalConfig.description)
  }

  // 更新 keywords
  if (finalConfig.keywords) {
    updateMetaTag('keywords', finalConfig.keywords)
  }

  // 更新 og:image
  if (finalConfig.ogImage) {
    updateMetaTag('og:image', finalConfig.ogImage)
    updateMetaTag('twitter:image', finalConfig.ogImage)
  }
}

/**
 * 更新或创建 meta 标签
 */
function updateMetaTag(name: string, content: string) {
  const isProperty = name.startsWith('og:') || name.startsWith('twitter:')
  const attr = isProperty ? 'property' : 'name'

  let meta = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement

  if (!meta) {
    meta = document.createElement('meta')
    meta.setAttribute(attr, name)
    document.head.appendChild(meta)
  }

  meta.setAttribute('content', content)
}

/**
 * 恢复默认 SEO 配置
 */
export function resetSEO() {
  updateSEO(DEFAULT_SEO)
}