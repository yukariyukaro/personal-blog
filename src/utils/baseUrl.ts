const normalizeBaseUrl = (baseUrl: string) => {
  if (!baseUrl) {
    return '/'
  }
  return baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
}

export const BASE_URL = normalizeBaseUrl(import.meta.env.BASE_URL)

export const resolvePublicAsset = (assetPath: string) =>
  `${BASE_URL}${assetPath.replace(/^\/+/, '')}`
