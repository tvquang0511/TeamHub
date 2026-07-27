import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutGrid,
  Calendar,
  Table as TableIcon,
  Clock,
  MessageSquare,
  Filter,
  Zap,
  ArrowRight,
  Download,
  Sparkles,
  Play,
  Pause,
  CheckCircle2,
  ShieldCheck,
  BarChart3,
} from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import { useAuth } from "../../../providers/AuthProvider";

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Demo Tab Switcher State for Multi-View Panel
  const [activeViewTab, setActiveViewTab] = useState<"kanban" | "timeline" | "table">("kanban");

  // Backup Demo State
  const [backupDownloaded, setBackupDownloaded] = useState(false);
  const [backupRestored, setBackupRestored] = useState(false);

  // Simulated Live Timer State for Stopwatch Demo Panel
  const [timerSeconds, setTimerSeconds] = useState(6142); // 01:42:22
  const [isTimerRunning, setIsTimerRunning] = useState(true);

  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const formatTimer = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-indigo-500 selection:text-white font-sans antialiased">
      {/* Sticky Top Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-8">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/")}>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 shadow-md">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
              TeamHub
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-5 lg:gap-7 text-xs font-semibold text-muted-foreground">
            <a href="#multi-view" className="hover:text-foreground transition-colors">
              Chế độ xem Đa chiều
            </a>
            <a href="#ai-breakdown" className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-bold hover:opacity-80 transition-opacity">
              <Sparkles className="h-3.5 w-3.5 fill-indigo-500/20" />
              AI Breakdown
            </a>
            <a href="#time-tracking" className="hover:text-foreground transition-colors">
              Bấm giờ Realtime
            </a>
            <a href="#chat-to-card" className="hover:text-foreground transition-colors">
              Chat & Card Engine
            </a>
            <a href="#json-backup" className="hover:text-foreground transition-colors">
              Sao lưu JSON
            </a>
            <a href="#features-grid" className="hover:text-foreground transition-colors">
              Tính năng khác
            </a>
          </nav>

          <div className="flex items-center gap-3">
            {user ? (
              <Button
                onClick={() => navigate("/workspaces")}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs h-9 px-4 shadow-md hover:opacity-90"
              >
                Vào Workspace
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/login")}
                  className="text-xs font-semibold hover:bg-muted"
                >
                  Đăng nhập
                </Button>
                <Button
                  size="sm"
                  onClick={() => navigate("/register")}
                  className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white font-bold text-xs h-9 px-4 shadow-md hover:opacity-90"
                >
                  Đăng ký miễn phí
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-20 md:pt-24 md:pb-28 bg-gradient-to-b from-indigo-950/20 via-background/95 to-background border-b border-border/40">
        {/* Glow orbs in hero section background */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full pointer-events-none overflow-hidden">
          <div className="absolute -top-32 left-1/4 h-96 w-96 rounded-full bg-indigo-500/15 blur-3xl" />
          <div className="absolute top-10 right-1/4 h-96 w-96 rounded-full bg-purple-500/15 blur-3xl" />
        </div>

        <div className="container mx-auto max-w-6xl px-4 sm:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 mb-8 backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Nền tảng Quản lý Dự án & Cộng tác Nhóm Chuyên nghiệp</span>
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl leading-tight max-w-5xl mx-auto">
            Giải Pháp Quản Lý Công Việc Tất-Cả-Trong-Một. <br />
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent">
              Nâng Tầm Hiệu Suất Cộng Tác Nhóm.
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            TeamHub cung cấp bộ công cụ quản trị công việc toàn diện: Chuyển đổi mượt mà giữa{" "}
            <strong className="font-semibold text-foreground">Bảng Kanban</strong>,{" "}
            <strong className="font-semibold text-foreground">Gantt Chart Timeline</strong>, và{" "}
            <strong className="font-semibold text-foreground">Bảng Notion-style</strong>, kết hợp cùng{" "}
            <strong className="font-semibold text-foreground">Bấm giờ Realtime</strong> và{" "}
            <strong className="font-semibold text-foreground">Chat-to-Card</strong> linh hoạt.
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
        </div>
      </section>

      {/* 🌟 CORE FEATURE #1: MULTI-VIEW WORKSPACE ENGINE (LARGE DEMO PANEL) */}
      <section id="multi-view" className="py-20 bg-background border-t border-border/40">
        <div className="container mx-auto max-w-7xl px-4 sm:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <Badge variant="outline" className="mb-3 border-blue-500/30 text-blue-600 bg-blue-500/10 font-bold">
              CORE #1 · CHẾ ĐỘ XEM ĐA CHIỀU
            </Badge>
            <h2 className="text-3xl font-extrabold sm:text-4xl tracking-tight">
              Linh hoạt Quan sát Dự án theo 3 Chế độ Xem
            </h2>
            <p className="mt-4 text-sm sm:text-base text-muted-foreground">
              Tùy chọn hiển thị phù hợp với từng giai đoạn và nhu cầu công việc của từng thành viên trong team.
            </p>

            {/* View Mode Switcher Buttons */}
            <div className="mt-8 inline-flex items-center p-1.5 rounded-xl border bg-muted/50 backdrop-blur-md">
              <button
                onClick={() => setActiveViewTab("kanban")}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold transition-all ${
                  activeViewTab === "kanban"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <LayoutGrid className="h-4 w-4 text-blue-600" />
                <span>1. Bảng Kanban Drag & Drop</span>
              </button>
              <button
                onClick={() => setActiveViewTab("timeline")}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold transition-all ${
                  activeViewTab === "timeline"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Calendar className="h-4 w-4 text-indigo-600" />
                <span>2. Gantt Chart Timeline (21 ngày)</span>
              </button>
              <button
                onClick={() => setActiveViewTab("table")}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold transition-all ${
                  activeViewTab === "table"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <TableIcon className="h-4 w-4 text-violet-600" />
                <span>3. Bảng Notion-Style Grid</span>
              </button>
            </div>
          </div>

          {/* LARGE DEMO PANEL SHOWCASE */}
          <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-6 shadow-2xl overflow-hidden max-w-6xl mx-auto">
            {activeViewTab === "kanban" && (
              <div className="space-y-4 animate-fade-in">
                <div className="flex items-center justify-between pb-3 border-b text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">📊 Giao diện Bảng Kanban Tương Tác</span>
                  <Badge variant="secondary" className="bg-blue-500/10 text-blue-600">Drag & Drop Ready</Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Column 1 */}
                  <div className="rounded-xl bg-muted/40 p-3 space-y-3 border">
                    <div className="flex items-center justify-between text-xs font-bold px-1">
                      <span>📌 CẦN LÀM (TO DO)</span>
                      <span className="text-muted-foreground">2</span>
                    </div>
                    <div className="rounded-lg bg-background p-3.5 shadow-2xs space-y-2 border">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-[10px] border-blue-500/30 text-blue-600">Frontend</Badge>
                        <span className="text-[10px] text-muted-foreground">⏱️ 0.0h / 4.0h</span>
                      </div>
                      <h4 className="font-semibold text-xs">Thiết kế UI Dashboard mới</h4>
                      <p className="text-[11px] text-muted-foreground">Xây dựng bộ màu HSL dark mode cao cấp...</p>
                    </div>
                  </div>

                  {/* Column 2 */}
                  <div className="rounded-xl bg-muted/40 p-3 space-y-3 border">
                    <div className="flex items-center justify-between text-xs font-bold px-1 text-amber-600">
                      <span>⚡ ĐANG THỰC HIỆN (IN PROGRESS)</span>
                      <span>1</span>
                    </div>
                    <div className="rounded-lg bg-background p-3.5 shadow-2xs space-y-2 border border-amber-500/40 ring-1 ring-amber-500/20">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-600">Core Engine</Badge>
                        <span className="text-[10px] text-amber-600 font-bold">⏱️ 1h 42m (Running)</span>
                      </div>
                      <h4 className="font-semibold text-xs">Bấm giờ Task Stopwatch Realtime</h4>
                      <p className="text-[11px] text-muted-foreground">Đồng đồng bấm giờ 0ms đồng bộ 100% qua Socket.IO...</p>
                    </div>
                  </div>

                  {/* Column 3 */}
                  <div className="rounded-xl bg-muted/40 p-3 space-y-3 border">
                    <div className="flex items-center justify-between text-xs font-bold px-1 text-emerald-600">
                      <span>✓ HOÀN THÀNH (DONE)</span>
                      <span>1</span>
                    </div>
                    <div className="rounded-lg bg-background p-3.5 shadow-2xs space-y-2 border opacity-90">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-600">Data</Badge>
                        <span className="text-[10px] text-emerald-600 font-bold">✓ 3.0h / 3.0h</span>
                      </div>
                      <h4 className="font-semibold text-xs">Xuất & Nhập Board JSON Backup</h4>
                      <p className="text-[11px] text-muted-foreground">Sao lưu toàn bộ dữ liệu chỉ với 1 click...</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeViewTab === "timeline" && (
              <div className="space-y-4 animate-fade-in">
                <div className="flex items-center justify-between pb-3 border-b text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">📅 Gantt Chart Timeline (Tiến độ 21 ngày)</span>
                  <Badge variant="secondary" className="bg-indigo-500/10 text-indigo-600">Live Schedule Bar</Badge>
                </div>
                <div className="space-y-3 p-2 bg-muted/20 rounded-xl">
                  <div className="flex items-center gap-4 text-xs">
                    <span className="w-44 font-semibold truncate shrink-0">1. Thiết kế UI Dashboard</span>
                    <div className="flex-1 bg-muted h-7 rounded-md relative overflow-hidden flex items-center px-2">
                      <div className="absolute left-0 top-0 bottom-0 w-[45%] bg-gradient-to-r from-blue-500 to-indigo-500 rounded-md opacity-90" />
                      <span className="relative z-10 text-[10px] font-bold text-white px-2">12 Thg 7 - 18 Thg 7 (Done 45%)</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="w-44 font-semibold truncate shrink-0">2. Realtime Stopwatch Engine</span>
                    <div className="flex-1 bg-muted h-7 rounded-md relative overflow-hidden flex items-center px-2">
                      <div className="absolute left-[30%] top-0 bottom-0 w-[50%] bg-gradient-to-r from-indigo-500 to-violet-500 rounded-md" />
                      <span className="relative z-10 text-[10px] font-bold text-white px-2">16 Thg 7 - 24 Thg 7 (In Progress)</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeViewTab === "table" && (
              <div className="space-y-4 animate-fade-in">
                <div className="flex items-center justify-between pb-3 border-b text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">📋 Bảng Dữ Liệu Notion-Style Grid</span>
                  <Badge variant="secondary" className="bg-violet-500/10 text-violet-600">Structured Data</Badge>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b bg-muted/50 text-muted-foreground font-semibold">
                        <th className="p-2.5">Tiêu đề Card</th>
                        <th className="p-2.5">Cột (Status)</th>
                        <th className="p-2.5">Người phụ trách</th>
                        <th className="p-2.5">Logged / Estimate</th>
                        <th className="p-2.5">Hạn chót</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      <tr>
                        <td className="p-2.5 font-medium">Bấm giờ Task Stopwatch Realtime</td>
                        <td className="p-2.5"><Badge variant="outline" className="text-amber-600">In Progress</Badge></td>
                        <td className="p-2.5">Quang Tran</td>
                        <td className="p-2.5 font-mono text-indigo-600 font-bold">1h 42m / 2.0h</td>
                        <td className="p-2.5 text-muted-foreground">26 Thg 7</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-medium">Xuất & Nhập Board JSON Backup</td>
                        <td className="p-2.5"><Badge variant="outline" className="text-emerald-600">Done</Badge></td>
                        <td className="p-2.5">Team Member</td>
                        <td className="p-2.5 font-mono text-emerald-600 font-bold">3.0h / 3.0h</td>
                        <td className="p-2.5 text-muted-foreground">25 Thg 7</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 🤖 CORE FEATURE #2: SMART AI BREAKDOWN SHOWCASE SECTION (Text Left, Demo Right) */}
      <section id="ai-breakdown" className="py-20 bg-muted/30 border-t border-border/40">
        <div className="container mx-auto max-w-7xl px-4 sm:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Description */}
            <div className="lg:col-span-5 space-y-6 text-left">
              <Badge variant="outline" className="border-indigo-500/30 text-indigo-600 bg-indigo-500/10 font-bold">
                CORE #2 · SMART AI SUB-TASK ENGINE
              </Badge>
              <h2 className="text-3xl font-extrabold sm:text-4xl tracking-tight leading-tight">
                Tự Động Phân Rã Công Việc Với AI
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                Biến các ý tưởng công việc phức tạp thành danh sách{" "}
                <strong className="font-semibold text-foreground">3-5 sub-tasks chi tiết, thực tế và sẵn sàng hành động</strong> bằng Tiếng Việt chỉ trong{" "}
                <strong className="font-semibold text-foreground">1-Click</strong>.
              </p>
              <ul className="space-y-3 text-xs sm:text-sm">
                <li className="flex items-center gap-2 font-medium">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>Nút "✨ AI Breakdown" được tích hợp sẵn trong Card Detail.</span>
                </li>
                <li className="flex items-center gap-2 font-medium">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>Phân tích chính xác ngữ cảnh Tiêu đề & Mô tả công việc.</span>
                </li>
                <li className="flex items-center gap-2 font-medium">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>Tự động chèn Checklist items chuẩn hóa vào CSDL PostgreSQL.</span>
                </li>
              </ul>
            </div>

            {/* Right Interactive AI Demo Panel */}
            <div className="lg:col-span-7">
              <div className="rounded-2xl border border-indigo-500/30 bg-card p-6 shadow-xl text-left space-y-5 relative overflow-hidden">
                <div className="flex items-center justify-between border-b pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-foreground">Thẻ: Xây dựng trang Đăng nhập & Đăng ký</h4>
                      <p className="text-[11px] text-muted-foreground">Mã hóa bcrypt, phát hành JWT token & Google OAuth</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => navigate(user ? "/workspaces" : "/register")}
                    className="h-8 px-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-xs shadow-sm hover:opacity-90"
                  >
                    <Sparkles className="mr-1.5 h-3.5 w-3.5 fill-white" />
                    ✨ AI Breakdown
                  </Button>
                </div>

                {/* AI Sub-tasks Result Output */}
                <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4 space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-bold text-indigo-700 dark:text-indigo-300 mb-1">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                      Danh sách Sub-tasks do AI phân tích:
                    </span>
                    <Badge variant="outline" className="border-emerald-500/40 text-emerald-600 bg-emerald-500/10 text-[10px]">100% Accuracy</Badge>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2.5 rounded-lg border border-border/60 bg-background p-2.5 shadow-2xs">
                      <div className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600 font-bold text-[10px]">✓</div>
                      <span className="text-xs font-semibold text-foreground">1. Khởi tạo Prisma Schema cho dữ liệu Người dùng và nạp Migration CSDL</span>
                    </div>
                    <div className="flex items-center gap-2.5 rounded-lg border border-border/60 bg-background p-2.5 shadow-2xs">
                      <div className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600 font-bold text-[10px]">✓</div>
                      <span className="text-xs font-semibold text-foreground">2. Viết REST API Controller xử lý Đăng ký, Đăng nhập và Refresh Token</span>
                    </div>
                    <div className="flex items-center gap-2.5 rounded-lg border border-border/60 bg-background p-2.5 shadow-2xs">
                      <div className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600 font-bold text-[10px]">✓</div>
                      <span className="text-xs font-semibold text-foreground">3. Thiết kế giao diện Form Đăng nhập với React Hook Form & Zod Validation</span>
                    </div>
                    <div className="flex items-center gap-2.5 rounded-lg border border-border/60 bg-background p-2.5 shadow-2xs">
                      <div className="flex h-4 w-4 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-600 font-bold text-[10px]">4</div>
                      <span className="text-xs font-semibold text-foreground">4. Tích hợp luồng gửi Email khôi phục mật khẩu qua SMTP Nodemailer</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 🌟 CORE FEATURE #3: REALTIME TASK STOPWATCH & TIME TRACKING (Demo Left, Text Right) */}
      <section id="time-tracking" className="py-20 bg-background border-t border-border/40">
        <div className="container mx-auto max-w-7xl px-4 sm:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Interactive Live Stopwatch Panel */}
            <div className="lg:col-span-7 order-2 lg:order-1">
              <div className="rounded-2xl border bg-card p-6 sm:p-8 shadow-xl text-left space-y-6 relative overflow-hidden">
                <div className="flex items-center justify-between border-b pb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-600">
                      <Clock className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm">Task: Tích hợp Payment Gateway Production</h4>
                      <span className="text-xs text-muted-foreground">Assignee: Quang Tran (Logged Time)</span>
                    </div>
                  </div>
                  <Badge variant="outline" className={isTimerRunning ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" : "bg-muted text-muted-foreground"}>
                    {isTimerRunning ? "🟢 Running" : "⏸️ Paused"}
                  </Badge>
                </div>

                {/* Ticking Timer Display */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-6 bg-muted/40 p-6 rounded-xl border">
                  <div>
                    <div className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">Thời gian đang chạy</div>
                    <div className="text-4xl sm:text-5xl font-extrabold font-mono text-indigo-600 mt-1">
                      {formatTimer(timerSeconds)}
                    </div>
                  </div>

                  <Button
                    onClick={() => setIsTimerRunning(!isTimerRunning)}
                    size="lg"
                    className={`h-12 px-6 text-sm font-bold shadow-md transition-all ${
                      isTimerRunning
                        ? "bg-rose-600 hover:bg-rose-700 text-white"
                        : "bg-emerald-600 hover:bg-emerald-700 text-white"
                    }`}
                  >
                    {isTimerRunning ? (
                      <>
                        <Pause className="mr-2 h-4 w-4 fill-white" />
                        Tạm dừng Bấm giờ
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-4 w-4 fill-white" />
                        Tiếp tục Bấm giờ
                      </>
                    )}
                  </Button>
                </div>

                {/* Logged vs Estimate Progress Bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span>Tiến độ Thực tế vs Ước tính (Logged / Estimate)</span>
                    <span className="text-indigo-600 font-mono font-bold">1h 42m / 3h 00m (57%)</span>
                  </div>
                  <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 w-[57%] rounded-full transition-all duration-500" />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Description */}
            <div className="lg:col-span-5 space-y-6 text-left order-1 lg:order-2">
              <Badge variant="outline" className="border-indigo-500/30 text-indigo-600 bg-indigo-500/10 font-bold">
                CORE #3 · BẤM GIỜ & QUẢN LÝ THỜI GIAN
              </Badge>
              <h2 className="text-3xl font-extrabold sm:text-4xl tracking-tight leading-tight">
                Đồng Hồ Bấm Giờ Realtime 0ms Optimistic UI
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                Đo lường thời gian làm việc thực tế (<strong className="font-semibold text-foreground">Logged Hours</strong>) so với số giờ ước tính (<strong className="font-semibold text-foreground">Estimate Hours</strong>) với độ chính xác đến từng giây.
              </p>
              <ul className="space-y-3 text-xs sm:text-sm">
                <li className="flex items-center gap-2 font-medium">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>Bấm giờ trực tiếp trên Card với phản hồi 0ms.</span>
                </li>
                <li className="flex items-center gap-2 font-medium">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>Cập nhật tiến độ % hoàn thành tự động.</span>
                </li>
                <li className="flex items-center gap-2 font-medium">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>Đồng bộ trạng thái đang chạy giữa các thành viên.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 🌟 CORE FEATURE #4: CHAT-TO-CARD & #CARD MENTIONS ENGINE (Text Left, Demo Right) */}
      <section id="chat-to-card" className="py-20 bg-muted/30 border-t border-border/40">
        <div className="container mx-auto max-w-7xl px-4 sm:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Description */}
            <div className="lg:col-span-5 space-y-6 text-left">
              <Badge variant="outline" className="border-blue-500/30 text-blue-600 bg-blue-500/10 font-bold">
                CORE #4 · CHAT & MENTION ENGINE
              </Badge>
              <h2 className="text-3xl font-extrabold sm:text-4xl tracking-tight leading-tight">
                Kết Nối Thông Suốt Giữa Chat & Kanban
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                Biến bất kỳ tin nhắn thảo luận nào thành Card công việc mới chỉ với 1 click. Gõ <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono text-indigo-600 font-bold">#</code> để tự động gợi ý và tạo Chip tương tác mở thẳng Card.
              </p>
              <ul className="space-y-3 text-xs sm:text-sm">
                <li className="flex items-center gap-2 font-medium">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>Menu ngữ cảnh 1-click "Tạo Card từ tin nhắn".</span>
                </li>
                <li className="flex items-center gap-2 font-medium">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>Autocomplete gợi ý danh sách Card khi gõ `#`.</span>
                </li>
                <li className="flex items-center gap-2 font-medium">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>Chip #Card tương tác mở trực tiếp Modal Card Detail.</span>
                </li>
              </ul>
            </div>

            {/* Right Interactive Chat Showcase */}
            <div className="lg:col-span-7">
              <div className="rounded-2xl border bg-card p-6 shadow-xl space-y-4 text-left">
                <div className="flex items-center justify-between border-b pb-3 text-xs">
                  <div className="flex items-center gap-2 font-bold">
                    <MessageSquare className="h-4 w-4 text-blue-600" />
                    <span>Board Chat Panel — Realtime Discussion</span>
                  </div>
                  <Badge variant="secondary" className="bg-blue-500/10 text-blue-600">Chat-to-Card Ready</Badge>
                </div>

                {/* Chat Message Item with Convert Button */}
                <div className="p-3.5 rounded-xl bg-muted/40 border space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-foreground">Nguyễn Văn A</span>
                    <span className="text-[10px] text-muted-foreground">10:42 AM</span>
                  </div>
                  <p className="text-xs text-foreground leading-relaxed">
                    "Cần bổ sung giao diện đăng nhập bằng OAuth Google cho dự án tuần tới."
                  </p>

                  <div className="pt-2 flex justify-end">
                    <Button size="sm" variant="outline" className="h-7 text-[11px] font-bold border-indigo-500/40 text-indigo-600 hover:bg-indigo-500/10">
                      <Sparkles className="mr-1.5 h-3 w-3" />
                      Tạo Card từ tin nhắn này
                    </Button>
                  </div>
                </div>

                {/* Interactive Mention Chips Message */}
                <div className="p-3.5 rounded-xl bg-blue-500/5 border border-blue-500/20 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-blue-600">Trần Văn B</span>
                    <span className="text-[10px] text-muted-foreground">10:45 AM</span>
                  </div>
                  <p className="text-xs text-foreground leading-relaxed">
                    Tôi đã kiểm tra thẻ công việc{" "}
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-700 font-bold text-[11px] border border-blue-500/30">
                      #OAuth-Google-Login
                    </span>{" "}
                    rồi nhé!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 🌟 CORE FEATURE #5: BOARD JSON BACKUP & RESTORE (Demo Left, Text Right) */}
      <section id="json-backup" className="py-20 bg-background border-t border-border/40">
        <div className="container mx-auto max-w-7xl px-4 sm:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Interactive Demo Panel */}
            <div className="lg:col-span-7 order-2 lg:order-1">
              <div className="rounded-2xl border bg-card p-6 sm:p-8 shadow-xl text-left space-y-6">
                <div className="flex items-center justify-between border-b pb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                      <Download className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm">JSON Data Backup & Restoration Engine</h4>
                      <span className="text-xs text-muted-foreground">Full Board Hierarchy Serialization</span>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                    100% Data Safe
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Export Box */}
                  <div className="p-4 rounded-xl border bg-muted/30 space-y-3">
                    <h5 className="font-bold text-xs">1. Xuất file JSON (Export)</h5>
                    <p className="text-[11px] text-muted-foreground">Tải về file sao lưu dự án bảo mật dạng JSON.</p>
                    <Button
                      onClick={() => setBackupDownloaded(true)}
                      variant="outline"
                      size="sm"
                      className="w-full text-xs font-bold border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10"
                    >
                      <Download className="mr-1.5 h-3.5 w-3.5" />
                      {backupDownloaded ? "✓ Đã tải file backup.json" : "Xuất File JSON Demo"}
                    </Button>
                  </div>

                  {/* Restore Box */}
                  <div className="p-4 rounded-xl border bg-muted/30 space-y-3">
                    <h5 className="font-bold text-xs">2. Khôi phục Board (Import)</h5>
                    <p className="text-[11px] text-muted-foreground">Tái tạo lại Board mới từ dữ liệu sao lưu.</p>
                    <Button
                      onClick={() => setBackupRestored(true)}
                      size="sm"
                      className="w-full text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700"
                    >
                      <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                      {backupRestored ? "✓ Đã phục hồi Board thành công!" : "Nhập File JSON Restore"}
                    </Button>
                  </div>
                </div>

                {/* Simulated JSON Preview */}
                <div className="p-3 bg-muted rounded-lg border text-[11px] font-mono text-muted-foreground overflow-hidden">
                  <div className="flex items-center justify-between pb-1 border-b mb-1 text-[10px] font-bold text-foreground">
                    <span>teamhub_board_backup.json</span>
                    <span className="text-emerald-600">42.5 KB</span>
                  </div>
                  <pre className="text-[10px] text-emerald-600 leading-tight">
{`{
  "title": "Dự án TeamHub SaaS 2026",
  "lists": [
    { "name": "Cần làm", "cards": [{ "title": "Bấm giờ Realtime", "estimateMinutes": 180 }] }
  ]
}`}
                  </pre>
                </div>
              </div>
            </div>

            {/* Right Description */}
            <div className="lg:col-span-5 space-y-6 text-left order-1 lg:order-2">
              <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 bg-emerald-500/10 font-bold">
                CORE #5 · AN TOÀN & SAO LƯU DỮ LIỆU
              </Badge>
              <h2 className="text-3xl font-extrabold sm:text-4xl tracking-tight leading-tight">
                Sao Lưu & Phục Hồi Dữ Liệu Board 1-Click
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                Xuất toàn bộ cấu hình Bảng, Cột, Thẻ, Checklist và Nhãn thành file JSON chuẩn hóa. Khôi phục dự án bất kỳ lúc nào với độ an toàn 100%.
              </p>
              <ul className="space-y-3 text-xs sm:text-sm">
                <li className="flex items-center gap-2 font-medium">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>Xuất file JSON cấu trúc đầy đủ 1-click.</span>
                </li>
                <li className="flex items-center gap-2 font-medium">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>Nhập JSON tái tạo lại toàn bộ Board mới lập tức.</span>
                </li>
                <li className="flex items-center gap-2 font-medium">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>Bảo toàn 100% Checklist, Thẻ, và Nhãn phân loại.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Grid Features */}
      <section id="features-grid" className="py-20 bg-muted/20 border-t border-border/40">
        <div className="container mx-auto max-w-7xl px-4 sm:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-extrabold sm:text-4xl tracking-tight">
              Bộ Công Cụ Quản Trị, Thống Kê & Bảo Mật Nâng Cao
            </h2>
            <p className="mt-4 text-sm sm:text-base text-muted-foreground">
              Đảm bảo an toàn dữ liệu 100% và tốc độ phản hồi tức thì cho toàn bộ team.
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 text-left">
            <div className="rounded-2xl border bg-card p-6 shadow-xs hover:shadow-md transition-shadow">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 mb-5">
                <Filter className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold">Bộ Lọc Thẻ Thông Minh (Advanced Filter)</h3>
              <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Nút lọc nhanh "Thẻ của tôi" 1-click, lọc theo thành viên phụ trách, nhãn màu và tình trạng hạn chót mượt mà trên mọi chế độ xem.
              </p>
            </div>

            <div className="rounded-2xl border bg-card p-6 shadow-xs hover:shadow-md transition-shadow">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 mb-5">
                <BarChart3 className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold">Báo Cáo & Thống Kê Hiệu Suất (Executive Analytics)</h3>
              <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Thống kê trực quan tiến độ dự án, tỷ lệ thẻ hoàn thành đúng hạn/quá hạn, biểu đồ khối lượng công việc và hiệu suất thời gian thực.
              </p>
            </div>

            <div className="rounded-2xl border bg-card p-6 shadow-xs hover:shadow-md transition-shadow">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 mb-5">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold">Phân Quyền Vai Trò Enterprise</h3>
              <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Phân quyền chặt chẽ giữa OWNER, ADMIN và MEMBER. Kiểm soát quyền tạo, chỉnh sửa và truy cập tài nguyên dự án an toàn.
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
      <footer className="border-t border-slate-800/80 bg-slate-950 py-10 text-xs text-slate-400">
        <div className="container mx-auto max-w-7xl px-4 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 font-bold text-white">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-sm">
              <Zap className="h-3.5 w-3.5 fill-white" />
            </div>
            <span className="text-sm font-extrabold bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
              TeamHub Enterprise © 2026
            </span>
          </div>
          <div className="text-slate-400 font-medium">
            Built with React 19, TypeScript, Express, Prisma, Redis & Socket.IO.
          </div>
        </div>
      </footer>
    </div>
  );
};
