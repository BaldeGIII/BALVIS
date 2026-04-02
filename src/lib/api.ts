const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").replace(
  /\/$/,
  ""
);

export function apiUrl(path: string) {
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export function createApiHeaders(apiKey?: string, headers?: HeadersInit) {
  const requestHeaders = new Headers(headers);

  if (apiKey?.trim()) {
    requestHeaders.set("X-API-Key", apiKey.trim());
  }

  return requestHeaders;
}
