function normalizeBaseUrl(url: string): string {
  // Prevent accidental trailing slashes from breaking joins.
  return url.replace(/\/+$/, "");
}

const defaultApiBaseUrl = "http://localhost:4000/api";

const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL;
const rawSocketUrl = import.meta.env.VITE_SOCKET_URL;

export const API_BASE_URL = normalizeBaseUrl(
  typeof rawApiBaseUrl === "string" && rawApiBaseUrl.trim() ? rawApiBaseUrl.trim() : defaultApiBaseUrl,
);

function apiBaseToSocketBase(apiBase: string) {
  return apiBase.endsWith("/api") ? apiBase.slice(0, -"/api".length) : apiBase;
}

export const SOCKET_BASE_URL = normalizeBaseUrl(
  typeof rawSocketUrl === "string" && rawSocketUrl.trim()
    ? rawSocketUrl.trim()
    : apiBaseToSocketBase(API_BASE_URL),
);
