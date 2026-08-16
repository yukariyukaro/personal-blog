const normalizeBaseUrl = (baseUrl: string) => {
  if (!baseUrl) {
    return "/";
  }
  return baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
};

const resolveRuntimeBaseUrl = (configuredBaseUrl: string) => {
  if (typeof window === "undefined") {
    return configuredBaseUrl;
  }
  const hostname = window.location.hostname.toLowerCase();
  if (hostname.endsWith(".github.io")) {
    return configuredBaseUrl;
  }
  if (configuredBaseUrl === "/") {
    return "/";
  }
  return window.location.pathname.startsWith(configuredBaseUrl)
    ? configuredBaseUrl
    : "/";
};

export const BASE_URL = resolveRuntimeBaseUrl(
  normalizeBaseUrl(import.meta.env.BASE_URL),
);

// 使用 jsDelivr 镜像加速静态资源加载
const CDN_BASE_URL =
  "https://cdn.jsdmirror.com/gh/yukariyukaro/personal-blog@main/public/";

export const resolvePublicAsset = (assetPath: string) => {
  // 开发环境下仍使用本地路径，生产环境使用 CDN
  if (import.meta.env.DEV) {
    return `${BASE_URL}${assetPath.replace(/^\/+/, "")}`;
  }
  return `${CDN_BASE_URL}${assetPath.replace(/^\/+/, "")}`;
};
