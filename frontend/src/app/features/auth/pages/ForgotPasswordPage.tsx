import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Zap, ArrowLeft, Mail, CheckCircle2 } from "lucide-react";

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
            Quên mật khẩu
          </CardTitle>
          <CardDescription className="text-center text-xs">
            Nhập email tài khoản của bạn để nhận liên kết khôi phục mật khẩu qua Email
          </CardDescription>
        </CardHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
        >
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-semibold">Email tài khoản</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  className="pl-9 h-10 rounded-xl"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  disabled={mutation.isPending || done}
                />
              </div>
            </div>

            {done ? (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-600 dark:text-emerald-400 flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  Nếu email tồn tại trong hệ thống, TeamHub Worker đã gửi thư hướng dẫn khôi phục tới <strong>{email}</strong>.
                </span>
              </div>
            ) : null}
          </CardContent>

          <CardFooter className="flex flex-col space-y-3 pt-2">
            <Button
              type="submit"
              className="w-full h-10 rounded-xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:opacity-95 text-white shadow-lg shadow-indigo-500/20"
              disabled={mutation.isPending || done}
            >
              {mutation.isPending ? "Đang gửi qua Worker..." : "Gửi email khôi phục"}
            </Button>

            <div className="text-center text-xs text-muted-foreground pt-1">
              Nhớ lại mật khẩu?{" "}
              <Link to="/login" className="font-semibold text-primary hover:underline">
                Đăng nhập ngay
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};
