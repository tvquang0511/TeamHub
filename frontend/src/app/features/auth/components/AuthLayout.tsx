import React from "react";
import { Link } from "react-router-dom";
import { Zap, ArrowLeft } from "lucide-react";

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
  bannerTitle?: string;
  bannerSubtitle?: string;
  bannerCtaText?: string;
  bannerCtaLink?: string;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({
  children,
  title,
  subtitle,
  bannerTitle = "Không gian cộng tác & Quản lý dự án thông minh",
  bannerSubtitle = "Nền tảng Kanban thời gian thực, trò chuyện theo từng Board, phân rã công việc tự động với AI và hàng đợi tác vụ ngầm mạnh mẽ.",
  bannerCtaText,
  bannerCtaLink,
}) => {
  return (
    <div className="flex min-h-screen w-full flex-col lg:flex-row bg-background">
      {/* CỘT TRÁI: Hero Banner Showcase (Ẩn trên màn hình nhỏ, hiện từ lg trở lên) */}
      <div className="relative hidden lg:flex lg:w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-900 p-12 text-white">
        {/* Background decorative circles & glow */}
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="absolute right-12 top-1/2 -translate-y-1/2 h-64 w-64 rounded-full border border-white/10" />
        <div className="absolute right-20 top-1/2 -translate-y-1/2 h-80 w-80 rounded-full border border-white/5" />

        {/* Top: Logo & Brand */}
        <div className="relative z-10">
          <Link to="/landing" className="inline-flex items-center gap-3 group">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-blue-600 shadow-md transition-transform group-hover:scale-105">
              <Zap className="h-6 w-6 fill-blue-600" />
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-black tracking-tight text-white">TeamHub</span>
              <span className="text-[10px] font-medium tracking-wider uppercase text-blue-200">
                Enterprise Agile Collaboration
              </span>
            </div>
          </Link>
        </div>

        {/* Middle: Headline & Value Proposition */}
        <div className="relative z-10 max-w-lg space-y-6 my-auto py-12">
          <h1 className="text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl text-white">
            {bannerTitle}
          </h1>
          <p className="text-base text-blue-100/90 leading-relaxed">
            {bannerSubtitle}
          </p>

          {bannerCtaText && bannerCtaLink && (
            <div className="pt-4">
              <Link
                to={bannerCtaLink}
                className="inline-flex items-center justify-center rounded-xl bg-red-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-red-900/30 transition-all hover:bg-red-500 hover:shadow-red-900/40 active:scale-95"
              >
                {bannerCtaText}
              </Link>
            </div>
          )}
        </div>

        {/* Bottom: Footer Copyright */}
        <div className="relative z-10 flex items-center justify-between text-xs text-blue-200/80">
          <span>© 2026 TeamHub Inc. All rights reserved.</span>
          <div className="flex gap-4">
            <Link to="/landing" className="hover:text-white transition-colors">
              Trang chủ
            </Link>
            <span className="text-blue-300/40">•</span>
            <span className="hover:text-white transition-colors cursor-pointer">Bảo mật</span>
            <span className="text-blue-300/40">•</span>
            <span className="hover:text-white transition-colors cursor-pointer">Điều khoản</span>
          </div>
        </div>
      </div>

      {/* CỘT PHẢI: Form Area */}
      <div className="flex flex-1 flex-col justify-between p-6 sm:p-10 lg:p-14 min-h-screen">
        {/* Top navigation */}
        <div className="flex items-center justify-between">
          <Link
            to="/landing"
            className="inline-flex items-center text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Quay lại trang chủ
          </Link>

          {/* Mobile brand header */}
          <div className="flex lg:hidden items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
              <Zap className="h-4 w-4 fill-white" />
            </div>
            <span className="font-bold text-base text-foreground">TeamHub</span>
          </div>
        </div>

        {/* Center: Main Form Content (Đẩy lên cao hơn trên desktop cho cân đối) */}
        <div className="mx-auto w-full max-w-md pt-4 sm:pt-6 lg:pt-2 lg:-mt-8 pb-8">
          <div className="mb-6 lg:mb-8 space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {title}
            </h2>
            <p className="text-sm text-muted-foreground">
              {subtitle}
            </p>
          </div>

          {children}
        </div>

        {/* Bottom copyright for mobile */}
        <div className="text-center text-xs text-muted-foreground lg:hidden">
          © 2026 TeamHub Inc.
        </div>
      </div>
    </div>
  );
};
