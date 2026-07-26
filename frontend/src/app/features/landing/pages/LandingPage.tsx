import React from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutGrid,
  Clock,
  MessageSquare,
  BarChart3,
  Zap,
  ArrowRight,
  Download,
  Users,
  Sparkles,
} from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import { useAuth } from "../../../providers/AuthProvider";

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-primary-foreground">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
        <div className="container mx-auto max-w-7xl flex h-16 items-center justify-between px-4 sm:px-8">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/")}>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/20">
              <Zap className="h-5 w-5 fill-white" />
            </div>
            <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent">
              TeamHub
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">
              Tính năng nổi bật
            </a>
            <a href="#views" className="hover:text-foreground transition-colors">
              Chế độ xem
            </a>
            <a href="#analytics" className="hover:text-foreground transition-colors">
              Thống kê Analytics
            </a>
            <a href="#security" className="hover:text-foreground transition-colors">
              Bảo mật & Backup
            </a>
          </nav>

          <div className="flex items-center gap-3">
            {user ? (
              <Button
                onClick={() => navigate("/workspaces")}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20 font-semibold"
              >
                Vào Workspace của tôi
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => navigate("/login")}>
                  Đăng nhập
                </Button>
                <Button
                  size="sm"
                  onClick={() => navigate("/register")}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20 font-semibold hover:opacity-95 transition-opacity"
                >
                  Đăng ký miễn phí
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-20 md:pt-24 md:pb-32 bg-gradient-to-b from-background via-muted/30 to-background">
        <div className="container mx-auto max-w-6xl px-4 sm:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 mb-8 animate-fade-in">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Nền tảng Quản lý Dự án & Cộng tác Nhóm Thế hệ mới</span>
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl leading-tight max-w-4xl mx-auto">
            Quản Lý Dự Án Thông Minh. <br />
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent">
              Theo Dõi Tiến Độ & Bấm Giờ Realtime.
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            TeamHub kết hợp sức mạnh giữa bảng Kanban, Timeline Gantt Chart, Bảng Notion-style, 
            Tính năng Bấm giờ Task Stopwatch, và Báo cáo Thống kê dành riêng cho Admin & Owner.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              onClick={() => navigate(user ? "/workspaces" : "/register")}
              className="w-full sm:w-auto h-12 px-8 text-sm font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white shadow-xl shadow-indigo-500/25 hover:scale-105 transition-all"
            >
              Trải nghiệm ngay miễn phí
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate(user ? "/workspaces" : "/login")}
              className="w-full sm:w-auto h-12 px-8 text-sm font-semibold border-border/80 hover:bg-muted"
            >
              Đăng nhập tài khoản
            </Button>
          </div>

          {/* Hero Feature Mockup Graphic */}
          <div className="mt-16 rounded-2xl border border-border/80 bg-background/60 p-3 shadow-2xl backdrop-blur-md max-w-5xl mx-auto">
            <div className="rounded-xl border bg-muted/20 overflow-hidden">
              <div className="flex items-center justify-between border-b bg-muted/60 px-4 py-3 text-xs">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-red-500/80" />
                  <div className="h-3 w-3 rounded-full bg-amber-500/80" />
                  <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
                  <span className="ml-2 font-semibold text-muted-foreground">TeamHub — Workspace Dashboard Demo</span>
                </div>
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                  Socket.IO Realtime Active
                </Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6 text-left">
                {/* Mock Card 1 */}
                <div className="rounded-xl border bg-background p-4 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 text-[10px]">TO DO</Badge>
                    <span className="text-[10px] text-muted-foreground">⏱️ 02:45:00</span>
                  </div>
                  <h4 className="font-bold text-sm">Thiết kế UI/UX Landing Page SaaS</h4>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    Xây dựng giao diện giới thiệu ấn tượng với các hiệu ứng Glassmorphism và Recharts analytics.
                  </p>
                  <div className="flex items-center justify-between pt-2 border-t text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1"><Users className="h-3 w-3 text-indigo-500" /> 2 Assignees</span>
                    <span className="font-bold text-emerald-600 font-mono">3.5h / 5.0h</span>
                  </div>
                </div>

                {/* Mock Card 2 */}
                <div className="rounded-xl border bg-background p-4 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 text-[10px]">IN PROGRESS</Badge>
                    <span className="text-[10px] text-amber-600 font-bold">⏱️ Live 00:15:42</span>
                  </div>
                  <h4 className="font-bold text-sm">Tích hợp Chat-to-Card & #Card Engine</h4>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    Chuyển tin nhắn chat thành Card công việc mới và hỗ trợ gõ # để đề cập Card thông minh.
                  </p>
                  <div className="flex items-center justify-between pt-2 border-t text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3 text-blue-500" /> 4 Messages</span>
                    <span className="font-bold text-indigo-600 font-mono">1.2h / 2.0h</span>
                  </div>
                </div>

                {/* Mock Card 3 */}
                <div className="rounded-xl border bg-background p-4 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 text-[10px]">DONE</Badge>
                    <span className="text-[10px] text-emerald-600 font-bold">✓ Hoàn thành</span>
                  </div>
                  <h4 className="font-bold text-sm">Executive Analytics Dashboard</h4>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    Báo cáo tổng quan hiệu suất Workspace dành riêng cho vai trò Admin và Owner.
                  </p>
                  <div className="flex items-center justify-between pt-2 border-t text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1"><BarChart3 className="h-3 w-3 text-emerald-500" /> Admin Report</span>
                    <span className="font-bold text-emerald-600 font-mono">100% Rate</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Section */}
      <section id="features" className="py-20 bg-background">
        <div className="container mx-auto max-w-7xl px-4 sm:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <Badge variant="outline" className="mb-3 border-indigo-500/30 text-indigo-600">
              Tính năng Enterprise
            </Badge>
            <h2 className="text-3xl font-extrabold sm:text-4xl tracking-tight">
              Mọi công cụ bạn cần để dẫn dắt dự án thành công
            </h2>
            <p className="mt-4 text-sm sm:text-base text-muted-foreground">
              Được thiết kế tối ưu cho trải nghiệm người dùng tốc độ cao, mượt mà và trực quan.
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {/* Feature 1 */}
            <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs hover:shadow-md transition-shadow">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 mb-5">
                <LayoutGrid className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold">Multi-View Mode (Kanban, Timeline, Table)</h3>
              <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Xem dự án dưới dạng bảng Kanban trực quan, biểu đồ tiến độ Gantt Chart Timeline 21 ngày, hoặc bảng dữ liệu Notion-style tiện lợi.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs hover:shadow-md transition-shadow">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 mb-5">
                <Clock className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold">Task Stopwatch & Time Tracking</h3>
              <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Đồng hồ bấm giờ trực tiếp 1-giây 0ms optimistic UI. Đo lường chính xác số giờ làm thực tế (**Logged Hours**) so với ước tính (**Estimate**).
              </p>
            </div>

            {/* Feature 3 */}
            <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs hover:shadow-md transition-shadow">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 mb-5">
                <MessageSquare className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold">Chat-to-Card & #Card Mentions</h3>
              <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Chuyển nhanh bất kỳ tin nhắn thảo luận nào thành một Card công việc mới. Gõ `#` để autocomplete và tạo Chip tương tác mở thẳng Card.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs hover:shadow-md transition-shadow">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 mb-5">
                <BarChart3 className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold">Executive Analytics cho Admin & Owner</h3>
              <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Trang thống kê cấp Workspace dành riêng cho Quản trị viên: Đánh giá khối lượng công việc nhóm (Team Workload) và chỉ số sức khỏe dự án.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs hover:shadow-md transition-shadow">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 mb-5">
                <Download className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold">Sao lưu & Khôi phục dữ liệu (JSON)</h3>
              <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Xuất toàn bộ cấu hình Board thành file JSON an toàn. Dễ dàng khôi phục dự án bất kỳ lúc nào mà không sợ mất dữ liệu.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs hover:shadow-md transition-shadow">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 mb-5">
                <Zap className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold">Socket.IO Realtime Engine</h3>
              <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Tốc độ đồng bộ 0ms giữa tất cả các thành viên trong nhóm. Cập nhật thẻ, tin nhắn chat và thông báo tức thì không cần tải lại trang.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Bottom Banner */}
      <section className="py-20 bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 text-white relative overflow-hidden">
        <div className="container mx-auto max-w-5xl px-4 sm:px-8 text-center relative z-10">
          <h2 className="text-3xl font-extrabold sm:text-4xl tracking-tight">
            Sẵn sàng nâng tầm hiệu suất làm việc nhóm của bạn?
          </h2>
          <p className="mt-4 text-base opacity-90 max-w-xl mx-auto">
            Trải nghiệm toàn bộ tính năng quản lý dự án hiện đại và mượt mà của TeamHub ngay hôm nay.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Button
              size="lg"
              onClick={() => navigate(user ? "/workspaces" : "/register")}
              className="h-12 px-8 text-sm font-bold bg-white text-indigo-700 hover:bg-slate-100 shadow-lg"
            >
              Đăng ký tài khoản ngay
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 bg-muted/20 text-xs text-muted-foreground">
        <div className="container mx-auto max-w-7xl px-4 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-bold text-foreground">
            <Zap className="h-4 w-4 text-indigo-600" />
            <span>TeamHub Enterprise © 2026</span>
          </div>
          <div>Built with React 19, TypeScript, Express, Prisma, Redis & Socket.IO.</div>
        </div>
      </footer>
    </div>
  );
};
