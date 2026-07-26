import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Zap, ArrowLeft } from "lucide-react";
import { useAuth } from "../../../providers/AuthProvider";
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

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    } catch (error) {
      // Error is handled in AuthProvider
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background via-muted/30 to-background p-4 relative">
      <Link
        to="/landing"
        className="absolute top-6 left-6 inline-flex items-center text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="mr-1.5 h-4 w-4" />
        Quay lại trang chủ
      </Link>

      <Card className="w-full max-w-md border-border/80 bg-card/90 shadow-2xl backdrop-blur-md rounded-2xl p-2">
        <CardHeader className="space-y-1">
          <div className="mb-2 flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/20">
              <Zap className="h-6 w-6 fill-white" />
            </div>
          </div>
          <CardTitle className="text-center text-2xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent">
            Đăng nhập TeamHub
          </CardTitle>
          <CardDescription className="text-center text-xs">
            Nhập email và mật khẩu để vào Workspace của bạn
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mật khẩu</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              <div className="text-right text-sm">
                <Link
                  to="/forgot-password"
                  className="font-medium text-blue-600 hover:underline"
                >
                  Quên mật khẩu?
                </Link>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold shadow-md shadow-blue-500/20 hover:opacity-95"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập ngay"}
            </Button>
            <div className="text-center text-sm text-gray-600">
              Chưa có tài khoản?{" "}
              <Link
                to="/register"
                className="font-medium text-blue-600 hover:underline"
              >
                Đăng ký ngay
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};
