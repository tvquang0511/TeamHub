import React, { useEffect, useState, useRef } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { CheckCircle2, XCircle, Loader2, Zap, ArrowRight, Home } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { authApi } from "../../../api/auth.api";

export const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<"loading" | "success" | "error">(token ? "loading" : "error");
  const [errorMessage, setErrorMessage] = useState(
    token ? "" : "Không tìm thấy mã xác thực. Đường dẫn có thể không chính xác hoặc đã bị chỉnh sửa."
  );
  const verifiedRef = useRef(false);

  useEffect(() => {
    if (!token) {
      return;
    }

    if (verifiedRef.current) return;
    verifiedRef.current = true;

    const verify = async () => {
      try {
        await authApi.verifyEmail({ token });
        setStatus("success");
      } catch (err: any) {
        setStatus("error");
        setErrorMessage(
          err.response?.data?.error?.message ||
          err.response?.data?.message ||
          "Mã xác thực không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập để nhận lại link kích hoạt mới."
        );
      }
    };

    verify();
  }, [token]);

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between bg-gradient-to-b from-background via-background to-muted/30 p-4 sm:p-6 lg:p-8">
      {/* Decorative Glows */}
      <div className="pointer-events-none absolute left-1/2 top-1/4 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />
      <div className="pointer-events-none absolute right-1/4 bottom-1/4 h-80 w-80 rounded-full bg-indigo-500/10 blur-3xl" />

      {/* Top Header Logo */}
      <header className="relative z-10 flex justify-center py-4">
        <Link to="/landing" className="inline-flex items-center gap-2.5 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20 transition-transform group-hover:scale-105">
            <Zap className="h-5 w-5 fill-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-foreground">TeamHub</span>
        </Link>
      </header>

      {/* Centered Main Card */}
      <main className="relative z-10 mx-auto w-full max-w-md my-auto py-8">
        <div className="rounded-2xl border border-border/80 bg-card/90 p-8 sm:p-10 shadow-2xl shadow-black/5 backdrop-blur-xl text-center space-y-6">
          {/* Loading State */}
          {status === "loading" && (
            <div className="space-y-6 py-4 animate-in fade-in-50 duration-300">
              <div className="relative mx-auto flex h-20 w-20 items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-blue-500/15 animate-ping" />
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-500/10 text-blue-600">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  Đang xác thực email...
                </h1>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Hệ thống đang kiểm tra mã xác thực của bạn, vui lòng đợi trong giây lát.
                </p>
              </div>
            </div>
          )}

          {/* Success State */}
          {status === "success" && (
            <div className="space-y-6 py-2 animate-in zoom-in-95 fade-in-50 duration-300">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 ring-8 ring-emerald-500/5">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  Xác thực thành công! 🎉
                </h1>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Tài khoản của bạn đã được kích hoạt hoàn tất. Hãy đăng nhập ngay để bắt đầu trải nghiệm không gian làm việc TeamHub.
                </p>
              </div>
              <div className="space-y-3 pt-2">
                <Button
                  asChild
                  className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-500/25 active:scale-[0.99] transition-all"
                >
                  <Link to="/login" className="flex items-center justify-center gap-2">
                    <span>Đến trang Đăng nhập</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="ghost"
                  className="w-full h-10 rounded-xl text-xs text-muted-foreground hover:text-foreground"
                >
                  <Link to="/landing" className="flex items-center justify-center gap-1.5">
                    <Home className="h-3.5 w-3.5" />
                    <span>Về trang chủ</span>
                  </Link>
                </Button>
              </div>
            </div>
          )}

          {/* Error State */}
          {status === "error" && (
            <div className="space-y-6 py-2 animate-in zoom-in-95 fade-in-50 duration-300">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10 text-destructive ring-8 ring-destructive/5">
                <XCircle className="h-10 w-10" />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  Xác thực thất bại
                </h1>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {errorMessage}
                </p>
              </div>
              <div className="space-y-3 pt-2">
                <Button
                  asChild
                  className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-500/25 active:scale-[0.99] transition-all"
                >
                  <Link to="/login" className="flex items-center justify-center gap-2">
                    <span>Về trang Đăng nhập</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="ghost"
                  className="w-full h-10 rounded-xl text-xs text-muted-foreground hover:text-foreground"
                >
                  <Link to="/landing" className="flex items-center justify-center gap-1.5">
                    <Home className="h-3.5 w-3.5" />
                    <span>Về trang chủ</span>
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Bottom Footer */}
      <footer className="relative z-10 py-4 text-center text-xs text-muted-foreground">
        © 2026 TeamHub Inc. All rights reserved.
      </footer>
    </div>
  );
};