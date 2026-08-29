import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Mail, Lock } from "lucide-react";
import { useAuth } from "../../../providers/AuthProvider";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { AuthLayout } from "../components/AuthLayout";

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/workspaces");
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await login({ email, password });
      navigate("/workspaces");
    } catch {
      // Error is handled in AuthProvider
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Đăng nhập tài khoản"
      subtitle="Nhập email và mật khẩu của bạn để truy cập không gian làm việc TeamHub"
      bannerTitle="Không gian làm việc trực tuyến của TeamHub"
      bannerSubtitle="Theo dõi dự án Kanban thời gian thực, trò chuyện tức thì theo Board, phân rã công việc tự động với AI và quản lý tiến độ mọi lúc, ngay trên trình duyệt."
      bannerCtaText="Đăng ký tài khoản mới"
      bannerCtaLink="/register"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium text-foreground">
            Email
          </Label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              placeholder="ban@vidu.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="pl-10 h-11 bg-background/50 border-input hover:border-primary/50 focus-visible:ring-1 focus-visible:ring-primary rounded-xl transition-all"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-sm font-medium text-foreground">
              Mật khẩu
            </Label>
            <Link
              to="/forgot-password"
              className="text-xs font-semibold text-blue-600 hover:text-blue-500 hover:underline transition-colors"
            >
              Quên mật khẩu?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="pl-10 pr-10 h-11 bg-background/50 border-input hover:border-primary/50 focus-visible:ring-1 focus-visible:ring-primary rounded-xl transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
            </button>
          </div>
        </div>

        <Button
          type="submit"
          className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-500/20 hover:shadow-blue-500/30 active:scale-[0.99] transition-all"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
        </Button>

        <div className="text-center pt-2 text-sm text-muted-foreground">
          Chưa có tài khoản?{" "}
          <Link
            to="/register"
            className="font-semibold text-blue-600 hover:text-blue-500 hover:underline transition-colors"
          >
            Đăng ký
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
};
