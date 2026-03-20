import axios, { AxiosError } from "axios";
import type { InternalAxiosRequestConfig } from "axios";
import type { ApiErrorResponse } from "../types/api";

// Backend API base URL - adjust this based on your environment
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api";

// Create axios instance with base configuration
export const httpClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Important for cookie-based refresh token
  headers: {
    "Content-Type": "application/json",
  },
});

// Store for access token (in-memory only, not localStorage)
let accessToken: string | null = null;

export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

export const getAccessToken = () => accessToken;

// Flag to prevent multiple refresh attempts
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error?: any) => void;
}> = [];

const processQueue = (token: string | null, error: any = null) => {
  failedQueue.forEach((promise) => {
    if (error || !token) {
      promise.reject(error || new Error("Refresh failed"));
    } else {
      promise.resolve(token);
    }
  });

  failedQueue = [];
};

// Request interceptor to add access token
httpClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
httpClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorResponse>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    const url = originalRequest?.url || "";
    const isAuthEndpoint = url.includes("/auth/login") || url.includes("/auth/register") || url.includes("/auth/refresh") || url.includes("/auth/logout");
    const errorCode = error.response?.data?.error?.code;

    // If error is 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      // Only try refresh for token problems
      if (errorCode && errorCode !== "AUTH_TOKEN_EXPIRED" && errorCode !== "AUTH_TOKEN_INVALID") {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((newToken) => {
            // Ensure header is set for the retried request
            (originalRequest.headers as any) = originalRequest.headers || {};
            (originalRequest.headers as any).Authorization = `Bearer ${newToken}`;
            return httpClient(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Attempt to refresh token (cookie will be sent automatically)
        const response = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          {},
          {
            withCredentials: true,
          }
        );

        const { accessToken: newAccessToken } = response.data;
        setAccessToken(newAccessToken);

        // Process queued requests
        processQueue(newAccessToken);
        isRefreshing = false;

        // Retry original request with new token
        return httpClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed, clear token and redirect to login
        processQueue(null, refreshError);
        isRefreshing = false;
        setAccessToken(null);

        // Trigger logout event
        window.dispatchEvent(new CustomEvent("auth:logout"));

        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Helper function to handle API errors
export const getApiError = (error: any): string => {
  if (axios.isAxiosError(error)) {
    const apiError = error.response?.data?.error;
    if (apiError) {
      return apiError.message || "An error occurred";
    }
    return error.message || "An error occurred";
  }
  return "An unexpected error occurred";
};
