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

export const resolvePublicAsset = (assetPath: string) =>
  `${BASE_URL}${assetPath.replace(/^\/+/, "")}`;
