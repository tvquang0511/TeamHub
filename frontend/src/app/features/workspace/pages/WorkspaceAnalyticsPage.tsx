import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, BarChart3, Clock, Users, ShieldAlert, CheckCircle2, AlertCircle, LayoutGrid } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { analyticsApi } from "../../../api/analytics.api";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "../../../components/ui/avatar";
import { Badge } from "../../../components/ui/badge";

export const WorkspaceAnalyticsPage: React.FC = () => {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();

  const { data: analytics, isLoading, isError } = useQuery({
    queryKey: ["analytics", "workspace", workspaceId],
    queryFn: () => analyticsApi.getWorkspaceAnalytics(workspaceId!),
    enabled: !!workspaceId,
  });

  if (isError) {
    return (
      <div className="container mx-auto max-w-6xl py-12 px-4">
        <Button variant="ghost" onClick={() => navigate(`/workspaces/${workspaceId}`)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Quay lại Workspace
        </Button>
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50/80 p-8 text-center shadow-lg">
          <ShieldAlert className="h-10 w-10 text-red-500 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-red-800">Quyền truy cập bị từ chối</h3>
          <p className="text-sm text-red-600 mt-1">
            Báo cáo thống kê tổng quan Workspace chỉ dành riêng cho **Quản trị viên (ADMIN)** và **Chủ sở hữu (OWNER)**.
          </p>
        </div>
      </div>
    );
  }

  const kpis = analytics?.kpis;
  const memberStats = analytics?.memberStats ?? [];
  const boardStats = analytics?.boardStats ?? [];

  return (
    <div className="min-h-screen bg-muted/20 py-8 px-4 sm:px-8">
      <div className="container mx-auto max-w-7xl space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <Button variant="ghost" size="sm" onClick={() => navigate(`/workspaces/${workspaceId}`)} className="mb-2">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Quay lại Workspace
            </Button>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20">
                <BarChart3 className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-foreground">{analytics?.workspace.name ?? "Workspace"}</h1>
                  <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
                    Báo cáo ADMIN & OWNER
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Thống kê hiệu suất toàn diện, tiến độ làm việc và khối lượng công việc nhóm
                </p>
              </div>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="py-20 text-center text-sm text-muted-foreground">
            Đang tổng hợp báo cáo thống kê Workspace...
          </div>
        ) : (
          <>
            {/* KPI Cards Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="border-border/60 shadow-xs">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-semibold text-muted-foreground">Tổng số Dự án (Boards)</CardTitle>
                  <LayoutGrid className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-foreground">{kpis?.totalBoards}</div>
                  <div className="text-xs text-muted-foreground mt-1">Dự án đang hoạt động</div>
                </CardContent>
              </Card>

              <Card className="border-border/60 shadow-xs">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-semibold text-muted-foreground">Tỷ lệ Hoàn thành Thẻ</CardTitle>
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-emerald-600">{kpis?.completionRate}%</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {kpis?.completedCards} / {kpis?.totalCards} thẻ đã xong
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/60 shadow-xs">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-semibold text-muted-foreground">Thời gian làm việc (Logged)</CardTitle>
                  <Clock className="h-4 w-4 text-indigo-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-foreground">{kpis?.totalLoggedHours}h</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Ước tính (Estimate): {kpis?.totalEstimatedHours}h
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/60 shadow-xs">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-semibold text-muted-foreground">Thẻ Quá hạn (Overdue)</CardTitle>
                  <AlertCircle className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-red-600">{kpis?.overdueCards}</div>
                  <div className="text-xs text-muted-foreground mt-1">Cần ưu tiên xử lý ngay</div>
                </CardContent>
              </Card>
            </div>

            {/* Team Workload & Performance Section */}
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Member Workload Bar Chart */}
              <Card className="lg:col-span-2 border-border/60 shadow-xs">
                <CardHeader>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    <span>Phân bổ Khối lượng Công việc Thành viên</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {memberStats.length === 0 ? (
                    <div className="py-12 text-center text-xs text-muted-foreground">
                      Chưa có dữ liệu phân công thẻ cho thành viên.
                    </div>
                  ) : (
                    <div className="h-72 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={memberStats} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                          <XAxis
                            dataKey="user.displayName"
                            tick={{ fontSize: 11 }}
                            interval={0}
                          />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip
                            formatter={(value: any, name: any) => [
                              value,
                              name === "assignedCards"
                                ? "Số thẻ được giao"
                                : name === "completedCards"
                                ? "Số thẻ đã xong"
                                : "Số giờ làm",
                            ]}
                          />
                          <Bar dataKey="assignedCards" fill="#3B82F6" radius={[4, 4, 0, 0]} name="assignedCards" />
                          <Bar dataKey="completedCards" fill="#10B981" radius={[4, 4, 0, 0]} name="completedCards" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Member Hours Breakdown */}
              <Card className="border-border/60 shadow-xs">
                <CardHeader>
                  <CardTitle className="text-base font-bold">Thống kê Giờ làm (Hours)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 max-h-72 overflow-y-auto pr-1">
                    {memberStats.map((ms) => (
                      <div key={ms.user.id} className="flex items-center justify-between gap-3 text-xs border-b pb-2.5 last:border-0">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Avatar className="h-7 w-7 shrink-0">
                            {ms.user.avatarUrl ? <AvatarImage src={ms.user.avatarUrl} /> : null}
                            <AvatarFallback className="bg-primary/10 text-primary font-bold text-[10px]">
                              {ms.user.displayName.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="font-semibold text-foreground truncate">{ms.user.displayName}</div>
                            <div className="text-[10px] text-muted-foreground">{ms.completedCards}/{ms.assignedCards} thẻ xong</div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="font-bold text-foreground font-mono">{ms.loggedHours}h</div>
                          <div className="text-[10px] text-muted-foreground">Đã lưu</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Board Health & Performance Table */}
            <Card className="border-border/60 shadow-xs">
              <CardHeader>
                <CardTitle className="text-base font-bold">Chỉ số Sức khỏe Các Dự án (Board Health)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/50 font-semibold text-muted-foreground border-b">
                      <tr>
                        <th className="px-4 py-3">Tên Dự án (Board)</th>
                        <th className="px-4 py-3">Tổng số Thẻ</th>
                        <th className="px-4 py-3">Hoàn thành</th>
                        <th className="px-4 py-3">Quá hạn</th>
                        <th className="px-4 py-3">Tổng giờ làm</th>
                        <th className="px-4 py-3">Tỷ lệ tiến độ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y border-b">
                      {boardStats.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-muted-foreground italic">
                            Chưa có dự án nào trong Workspace này.
                          </td>
                        </tr>
                      ) : (
                        boardStats.map((b) => (
                          <tr
                            key={b.id}
                            onClick={() => navigate(`/boards/${b.id}/analytics`)}
                            className="hover:bg-muted/40 transition-colors cursor-pointer"
                          >
                            <td className="px-4 py-3 font-semibold text-foreground hover:underline">
                              {b.name}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">{b.totalCards}</td>
                            <td className="px-4 py-3 text-emerald-600 font-semibold">{b.completedCards}</td>
                            <td className="px-4 py-3 text-red-500 font-semibold">
                              {b.overdueCards > 0 ? (
                                <span className="flex items-center gap-1 text-red-600 font-bold">
                                  <AlertCircle className="h-3.5 w-3.5" />
                                  {b.overdueCards}
                                </span>
                              ) : (
                                "0"
                              )}
                            </td>
                            <td className="px-4 py-3 text-foreground font-mono">{b.loggedHours}h</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-24 bg-muted h-2 rounded-full overflow-hidden">
                                  <div
                                    className="bg-emerald-500 h-full rounded-full"
                                    style={{ width: `${b.completionRate}%` }}
                                  />
                                </div>
                                <span className="font-semibold text-[11px]">{b.completionRate}%</span>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};
