import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { authApi } from "../api/auth.api";
import { setAccessToken, getAccessToken } from "../api/http";
import { notify } from "../lib/toastHelper";
import type { User, LoginRequest, RegisterRequest } from "../types/api";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();

  // Bootstrap: try to refresh token on mount
  useEffect(() => {
    const bootstrap = async () => {
      try {
        const { accessToken } = await authApi.refresh();
        setAccessToken(accessToken);

        // Fetch user info (backend should implement /auth/me)
        try {
          const me = await authApi.me();
          setUser(me);
        } catch {
          // If /auth/me is not available or fails, keep user null
        }
      } catch (error) {
        // No valid refresh token, user is not authenticated
        setAccessToken(null);
      } finally {
        setIsLoading(false);
      }
    };

    bootstrap();
  }, []);

  // Listen for logout events (from interceptor)
  useEffect(() => {
    const handleLogout = () => {
      setUser(null);
      setAccessToken(null);
      queryClient.clear();
    };

    window.addEventListener("auth:logout", handleLogout);
    return () => window.removeEventListener("auth:logout", handleLogout);
  }, [queryClient]);

  const login = useCallback(async (data: LoginRequest) => {
    try {
      queryClient.clear();
      const response = await authApi.login(data);
      setAccessToken(response.accessToken);
      setUser(response.user);
      notify.success("Đăng nhập thành công", `Chào mừng ${response.user.displayName}!`);
    } catch (error: any) {
      notify.error(error, "Đăng nhập thất bại");
      throw error;
    }
  }, [queryClient]);

  const register = useCallback(async (data: RegisterRequest) => {
    try {
      queryClient.clear();
      const response = await authApi.register(data);
      setAccessToken(response.accessToken);
      setUser(response.user);
      notify.success("Đăng ký tài khoản thành công", `Chào mừng ${response.user.displayName}!`);
    } catch (error: any) {
      notify.error(error, "Đăng ký thất bại");
      throw error;
    }
  }, [queryClient]);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch (error) {
      // Even if logout fails on server, clear local state
    } finally {
      setUser(null);
      setAccessToken(null);
      queryClient.clear();
      notify.info("Đã đăng xuất", "Bạn đã đăng xuất khỏi ứng dụng.");
    }
  }, [queryClient]);

  const isAuthenticated = !isLoading && (!!getAccessToken() || !!user);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
