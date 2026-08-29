import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Mail, Lock, AlertCircle, Send, CheckCircle2, Loader2 } from "lucide-react";
import { useAuth } from "../../../providers/AuthProvider";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { AuthLayout } from "../components/AuthLayout";
import { authApi } from "../../../api/auth.api";
import { notify } from "../../../lib/toastHelper";

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

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
    setUnverifiedEmail(null);
    setResendSuccess(false);

    try {
      await login({ email, password });
      navigate("/workspaces");
    } catch (error: any) {
      const errorCode = error.response?.data?.error?.code || error.response?.data?.code;
      if (errorCode === "AUTH_EMAIL_NOT_VERIFIED") {
        setUnverifiedEmail(email);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendVerification = async () => {
    if (!unverifiedEmail) return;
    setIsResending(true);
    try {
      await authApi.resendVerificationEmail({ email: unverifiedEmail });
      setResendSuccess(true);
      notify.success("Đã gửi lại link xác thực", "Vui lòng kiểm tra hộp thư email của bạn.");
    } catch (err: any) {
      notify.error(err, "Gửi lại link xác thực thất bại");
    } finally {
      setIsResending(false);
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
        {/* Banner thông báo tài khoản chưa xác thực + Nút gửi lại email */}
        {unverifiedEmail && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-900 dark:text-amber-200 animate-in fade-in-50 duration-300">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <div className="space-y-2 flex-1">
                <p className="font-semibold text-amber-900 dark:text-amber-100 text-sm">
                  Tài khoản chưa được kích hoạt
                </p>
                <p className="text-xs text-amber-800 dark:text-amber-300/90 leading-relaxed">
                  Email <span className="font-medium underline">{unverifiedEmail}</span> chưa được xác thực. Bạn cần xác thực trước khi có thể đăng nhập.
                </p>
                {resendSuccess ? (
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 pt-1">
                    <CheckCircle2 className="h-4 w-4" />
                    Đã gửi lại email xác thực thành công! Vui lòng kiểm tra hộp thư.
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isResending}
                    onClick={handleResendVerification}
                    className="mt-1 h-8 rounded-lg border-amber-500/40 bg-amber-500/20 text-amber-900 dark:text-amber-100 hover:bg-amber-500/30 text-xs font-semibold shadow-none transition-all active:scale-95"
                  >
                    {isResending ? (
                      <>
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        Đang gửi link...
                      </>
                    ) : (
                      <>
                        <Send className="mr-1.5 h-3.5 w-3.5" />
                        Gửi lại link xác thực
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

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
