import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Mail, Lock, User } from "lucide-react";
import { useAuth } from "../../../providers/AuthProvider";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { AuthLayout } from "../components/AuthLayout";

export const RegisterPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register, isAuthenticated } = useAuth();
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
      await register({ email, password, displayName });
      navigate("/login");
    } catch (error) {
      // Error is handled in AuthProvider
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Đăng ký tài khoản"
      subtitle="Bắt đầu quản lý dự án hiệu quả cùng đội ngũ của bạn với TeamHub"
      bannerTitle="Khởi tạo không gian làm việc số của bạn"
      bannerSubtitle="Trải nghiệm đầy đủ tính năng Kanban trực quan, tự động hóa phân rã task bằng AI, gửi email nhắc nhở tự động và bảo mật dữ liệu cấp doanh nghiệp."
      bannerCtaText="Đã có tài khoản? Đăng nhập"
      bannerCtaLink="/login"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="displayName" className="text-sm font-medium text-foreground">
            Tên hiển thị
          </Label>
          <div className="relative">
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="displayName"
              type="text"
              placeholder="Nguyễn Văn A"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              autoComplete="name"
              className="pl-10 h-11 bg-background/50 border-input hover:border-primary/50 focus-visible:ring-1 focus-visible:ring-primary rounded-xl transition-all"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium text-foreground">
            Email công việc
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
          <Label htmlFor="password" className="text-sm font-medium text-foreground">
            Mật khẩu
          </Label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Tối thiểu 6 ký tự"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              minLength={6}
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
          <p className="text-[11px] text-muted-foreground">
            Mật khẩu cần ít nhất 6 ký tự để bảo vệ tài khoản an toàn
          </p>
        </div>

        <Button
          type="submit"
          className="w-full h-11 mt-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-500/20 hover:shadow-blue-500/30 active:scale-[0.99] transition-all"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Đang tạo tài khoản..." : "Tạo tài khoản ngay"}
        </Button>

        <div className="text-center pt-2 text-sm text-muted-foreground">
          Đã có tài khoản?{" "}
          <Link
            to="/login"
            className="font-semibold text-blue-600 hover:text-blue-500 hover:underline transition-colors"
          >
            Đăng nhập
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
};
