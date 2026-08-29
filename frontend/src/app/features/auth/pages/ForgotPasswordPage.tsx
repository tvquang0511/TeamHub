import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Mail, CheckCircle2 } from "lucide-react";

import { authApi } from "../../../api/auth.api";
import { notify } from "../../../lib/toastHelper";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { AuthLayout } from "../components/AuthLayout";

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  const mutation = useMutation({
    mutationFn: async () => {
      const normalized = email.trim().toLowerCase();
      await authApi.forgotPassword({ email: normalized });
    },
    onSuccess: () => {
      setDone(true);
      notify.success("Yêu cầu đã được gửi", "Kiểm tra hòm thư Gmail của bạn để lấy liên kết khôi phục.");
    },
    onError: (err) => {
      notify.error(err, "Không thể gửi email khôi phục");
    },
  });

  return (
    <AuthLayout
      title="Khôi phục mật khẩu"
      subtitle="Nhập email tài khoản của bạn để nhận liên kết đặt lại mật khẩu an toàn"
      bannerTitle="Bảo mật & Quản lý tài khoản dễ dàng"
      bannerSubtitle="TeamHub sử dụng hệ thống Worker ngầm gửi email bảo mật giúp bạn khôi phục quyền truy cập vào Workspace chỉ trong vài giây."
      bannerCtaText="Quay lại Đăng nhập"
      bannerCtaLink="/login"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
        className="space-y-5"
      >
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium text-foreground">
            Email tài khoản
          </Label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              placeholder="ban@vidu.com"
              className="pl-10 h-11 bg-background/50 border-input hover:border-primary/50 focus-visible:ring-1 focus-visible:ring-primary rounded-xl transition-all"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              disabled={mutation.isPending || done}
            />
          </div>
        </div>

        {done && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-600 dark:text-emerald-400 flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
            <span className="leading-relaxed">
              Nếu email tồn tại trong hệ thống, TeamHub Worker đã gửi thư hướng dẫn khôi phục tới <strong>{email}</strong>. Vui lòng kiểm tra hòm thư của bạn!
            </span>
          </div>
        )}

        <Button
          type="submit"
          className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-500/20 hover:shadow-blue-500/30 active:scale-[0.99] transition-all"
          disabled={mutation.isPending || done}
        >
          {mutation.isPending ? "Đang gửi qua Worker..." : "Gửi email khôi phục"}
        </Button>

        <div className="text-center pt-2 text-sm text-muted-foreground">
          Đã nhớ lại mật khẩu?{" "}
          <Link
            to="/login"
            className="font-semibold text-blue-600 hover:text-blue-500 hover:underline transition-colors"
          >
            Đăng nhập ngay
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
};
