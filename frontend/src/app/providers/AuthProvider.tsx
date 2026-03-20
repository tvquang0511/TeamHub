import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { authApi } from "../api/auth.api";
import { setAccessToken, getAccessToken } from "../api/http";
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
    };

    window.addEventListener("auth:logout", handleLogout);
    return () => window.removeEventListener("auth:logout", handleLogout);
  }, []);

  const login = useCallback(async (data: LoginRequest) => {
    try {
      const response = await authApi.login(data);
      setAccessToken(response.accessToken);
      setUser(response.user);
      // toast can be wired later
    } catch (error: any) {
      const message =
        error.response?.data?.error?.message || "Đăng nhập thất bại";
      console.error(message);
      throw error;
    }
  }, []);

  const register = useCallback(async (data: RegisterRequest) => {
    try {
      const response = await authApi.register(data);
      setAccessToken(response.accessToken);
      setUser(response.user);
      // toast can be wired later
    } catch (error: any) {
      const message = error.response?.data?.error?.message || "Đăng ký thất bại";
      console.error(message);
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
      setUser(null);
      setAccessToken(null);
      // toast can be wired later
    } catch (error) {
      // Even if logout fails on server, clear local state
      setUser(null);
      setAccessToken(null);
    }
  }, []);

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
