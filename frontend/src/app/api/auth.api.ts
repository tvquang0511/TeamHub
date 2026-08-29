import { httpClient } from "./http";
import type {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  RegisterResponse,
  User,
} from "../types/api";

export const authApi = {
  // Register new user
  register: async (data: RegisterRequest): Promise<RegisterResponse> => {
    const response = await httpClient.post<RegisterResponse>("/auth/register", data);
    return response.data;
  },

  // Login user
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await httpClient.post<AuthResponse>("/auth/login", data);
    return response.data;
  },

  // Refresh access token (cookie-based, no body needed)
  refresh: async (): Promise<{ accessToken: string; user?: User }> => {
    const response = await httpClient.post<{ accessToken: string; user?: User }>(
      "/auth/refresh",
      {}
    );
    return response.data;
  },

  // Logout user
  logout: async (): Promise<void> => {
    await httpClient.post("/auth/logout", {});
  },

  // Get current user (optional, if backend supports)
  me: async (): Promise<User> => {
    const response = await httpClient.get<User>("/auth/me");
    return response.data;
  },

  forgotPassword: async (data: { email: string }): Promise<{ ok: boolean }> => {
    const response = await httpClient.post<{ ok: boolean }>("/auth/forgot-password", data);
    return response.data;
  },

  resetPassword: async (data: { token: string; newPassword: string }): Promise<{ ok: boolean }> => {
    const response = await httpClient.post<{ ok: boolean }>("/auth/reset-password", data);
    return response.data;
  },

  verifyEmail: async (data: { token: string }): Promise<{ ok: boolean }> => {
    const response = await httpClient.post<{ ok: boolean }>("/auth/verify-email", data);
    return response.data;
  },

  resendVerificationEmail: async (data: { email: string }): Promise<{ ok: boolean }> => {
    const response = await httpClient.post<{ ok: boolean }>("/auth/resend-verification", data);
    return response.data;
  },
};
