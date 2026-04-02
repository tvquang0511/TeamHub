function normalizeBaseUrl(url: string): string {
  // Prevent accidental trailing slashes from breaking joins.
  return url.replace(/\/+$/, "");
}

const defaultApiBaseUrl = "http://localhost:4000/api";

const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL;

export const API_BASE_URL = normalizeBaseUrl(
  typeof rawApiBaseUrl === "string" && rawApiBaseUrl.trim() ? rawApiBaseUrl.trim() : defaultApiBaseUrl,
);
