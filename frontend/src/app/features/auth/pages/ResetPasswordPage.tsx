import React, { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Lock, CheckCircle2, Eye, EyeOff } from "lucide-react";

import { authApi } from "../../../api/auth.api";
import { notify } from "../../../lib/toastHelper";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { AuthLayout } from "../components/AuthLayout";

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = useMemo(() => {
    const hash = window.location.hash || "";
    const m = hash.match(/(?:^#|[&#])token=([^&]+)/);
    if (m?.[1]) return decodeURIComponent(m[1]);
    return searchParams.get("token") ?? "";
  }, [searchParams]);
  
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [done, setDone] = useState(false);

  const mismatch = Boolean(newPassword) && Boolean(confirmPassword) && newPassword !== confirmPassword;

  const mutation = useMutation({
    mutationFn: async () => {
      if (!token) throw new Error("Thiếu token đặt lại mật khẩu trong liên kết");
      if (newPassword !== confirmPassword) throw new Error("Mật khẩu xác nhận không trùng khớp");
      await authApi.resetPassword({ token, newPassword });
    },
    onSuccess: async () => {
      setDone(true);
      notify.success("Đổi mật khẩu thành công!", "Đang chuyển hướng tới trang Đăng nhập...");
      setTimeout(() => navigate("/login"), 1200);
    },
    onError: (err) => {
      notify.error(err, "Đặt lại mật khẩu thất bại");
    },
  });

  return (
    <AuthLayout
      title="Đặt lại mật khẩu"
      subtitle="Nhập mật khẩu mới bảo mật để hoàn tất quá trình khôi phục tài khoản của bạn"
      bannerTitle="Khôi phục quyền truy cập an toàn"
      bannerSubtitle="Thiết lập mật khẩu mới ngay bây giờ để tiếp tục tham gia các dự án và board làm việc cùng đồng đội trên TeamHub."
      bannerCtaText="Quay lại Đăng nhập"
      bannerCtaLink="/login"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
        className="space-y-4"
      >
        {!token && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-xs text-destructive flex items-center gap-2">
            <span>Liên kết không hợp lệ (thiếu token). Hãy kiểm tra lại email hoặc gửi lại yêu cầu.</span>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="newPassword" className="text-sm font-medium text-foreground">
            Mật khẩu mới
          </Label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="newPassword"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              className="pl-10 pr-10 h-11 bg-background/50 border-input hover:border-primary/50 focus-visible:ring-1 focus-visible:ring-primary rounded-xl transition-all"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              autoComplete="new-password"
              disabled={mutation.isPending || done || !token}
              minLength={6}
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

        <div className="space-y-2">
          <Label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
            Xác nhận mật khẩu mới
          </Label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="confirmPassword"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              className="pl-10 pr-10 h-11 bg-background/50 border-input hover:border-primary/50 focus-visible:ring-1 focus-visible:ring-primary rounded-xl transition-all"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
              disabled={mutation.isPending || done || !token}
              minLength={6}
            />
          </div>
          {mismatch && (
            <p className="text-xs font-medium text-destructive">Mật khẩu xác nhận chưa trùng khớp</p>
          )}
        </div>

        {done && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2.5">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>Mật khẩu của bạn đã được cập nhật thành công! Đang chuyển hướng...</span>
          </div>
        )}

        <Button
          type="submit"
          className="w-full h-11 mt-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-500/20 hover:shadow-blue-500/30 active:scale-[0.99] transition-all"
          disabled={mutation.isPending || done || !token || mismatch}
        >
          {mutation.isPending ? "Đang cập nhật..." : "Xác nhận đổi mật khẩu"}
        </Button>

        <div className="text-center pt-2 text-sm text-muted-foreground">
          <Link to="/login" className="font-semibold text-blue-600 hover:text-blue-500 hover:underline transition-colors">
            Hủy và quay lại Đăng nhập
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
};
