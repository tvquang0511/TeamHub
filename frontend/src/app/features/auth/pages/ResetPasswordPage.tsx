import React, { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Zap, ArrowLeft, Lock, CheckCircle2 } from "lucide-react";

import { authApi } from "../../../api/auth.api";
import { notify } from "../../../lib/toastHelper";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";

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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background via-muted/30 to-background p-4 relative">
      <Link
        to="/login"
        className="absolute top-6 left-6 inline-flex items-center text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="mr-1.5 h-4 w-4" />
        Quay lại đăng nhập
      </Link>

      <Card className="w-full max-w-md border-border/80 bg-card/90 shadow-2xl backdrop-blur-md rounded-2xl p-2">
        <CardHeader className="space-y-1">
          <div className="mb-2 flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/20">
              <Zap className="h-6 w-6 fill-white" />
            </div>
          </div>
          <CardTitle className="text-center text-2xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent">
            Đặt lại mật khẩu
          </CardTitle>
          <CardDescription className="text-center text-xs">
            Nhập mật khẩu mới bảo mật để hoàn tất khôi phục tài khoản
          </CardDescription>
        </CardHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
        >
          <CardContent className="space-y-4">
            {!token ? (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-xs text-destructive flex items-center gap-2">
                <span>Liên kết không hợp lệ (thiếu token). Hãy kiểm tra lại email hoặc gửi lại yêu cầu.</span>
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="newPassword" className="text-xs font-semibold">Mật khẩu mới</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="••••••••"
                  className="pl-9 h-10 rounded-xl"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  disabled={mutation.isPending || done || !token}
                  minLength={6}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-xs font-semibold">Xác nhận mật khẩu mới</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  className="pl-9 h-10 rounded-xl"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  disabled={mutation.isPending || done || !token}
                  minLength={6}
                />
              </div>
              {mismatch && (
                <p className="text-[11px] font-medium text-destructive">Mật khẩu xác nhận chưa trùng khớp</p>
              )}
            </div>

            {done ? (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2.5">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>Mật khẩu của bạn đã được cập nhật thành công! Đang chuyển hướng...</span>
              </div>
            ) : null}
          </CardContent>

          <CardFooter className="flex flex-col space-y-3 pt-2">
            <Button
              type="submit"
              className="w-full h-10 rounded-xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:opacity-95 text-white shadow-lg shadow-indigo-500/20"
              disabled={mutation.isPending || done || !token || mismatch}
            >
              {mutation.isPending ? "Đang cập nhật..." : "Xác nhận đổi mật khẩu"}
            </Button>

            <div className="text-center text-xs text-muted-foreground pt-1">
              <Link to="/login" className="font-semibold text-primary hover:underline">
                Hủy và quay lại Đăng nhập
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};
