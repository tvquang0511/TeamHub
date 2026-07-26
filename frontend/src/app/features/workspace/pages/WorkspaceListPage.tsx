import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { workspacesApi } from "../../../api/workspaces.api";
import { Button } from "../../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../../components/ui/dialog";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Textarea } from "../../../components/ui/textarea";
import { Badge } from "../../../components/ui/badge";
import { Plus, Briefcase, ChevronRight, Sparkles } from "lucide-react";
// toast placeholder (wire real toast later)

import { WorkspaceListSkeleton } from "../../../components/shared/WorkspaceListSkeleton";
import { EmptyState } from "../../../components/shared/EmptyState";

export const WorkspaceListPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [newWorkspaceDescription, setNewWorkspaceDescription] = useState("");

  const { data: workspaces, isLoading } = useQuery({
    queryKey: ["workspaces"],
    queryFn: workspacesApi.getAll,
  });

  const createMutation = useMutation({
    mutationFn: workspacesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      setIsCreateDialogOpen(false);
      setNewWorkspaceName("");
      setNewWorkspaceDescription("");
    },
    onError: (error: any) => {
      console.error(error.response?.data?.error?.message || "Tạo workspace thất bại");
    },
  });

  const handleCreateWorkspace = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      name: newWorkspaceName,
      // Backend currently accepts only name; keep description for future.
      description: newWorkspaceDescription || undefined,
    });
  };

  if (isLoading) {
    return <WorkspaceListSkeleton />;
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400 mb-2">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Không gian Làm việc Nhóm</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent">
            Danh sách Workspace của bạn
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Quản lý tất cả không gian làm việc và các bảng công việc (Boards) liên quan.
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold shadow-md shadow-blue-500/20 hover:opacity-95">
              <Plus className="mr-2 h-5 w-5" />
              Tạo Workspace mới
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleCreateWorkspace}>
              <DialogHeader>
                <DialogTitle>Tạo Workspace mới</DialogTitle>
                <DialogDescription>
                  Workspace là nơi nhóm của bạn cộng tác trên các boards
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Tên workspace</Label>
                  <Input
                    id="name"
                    placeholder="VD: Marketing Team"
                    value={newWorkspaceName}
                    onChange={(e) => setNewWorkspaceName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Mô tả (tuỳ chọn)</Label>
                  <Textarea
                    id="description"
                    placeholder="Mô tả ngắn về workspace này..."
                    value={newWorkspaceDescription}
                    onChange={(e) => setNewWorkspaceDescription(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Huỷ
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Đang tạo..." : "Tạo"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {workspaces && workspaces.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {workspaces.map((workspace) => (
            <Card
              key={workspace.id}
              className="group cursor-pointer rounded-2xl border border-border/80 bg-card p-2 shadow-xs transition-all duration-200 hover:shadow-xl hover:border-indigo-500/40 hover:-translate-y-1"
              onClick={() => navigate(`/workspaces/${workspace.id}`)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/20 group-hover:scale-110 transition-transform">
                    <Briefcase className="h-6 w-6" />
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                </div>
                <CardTitle className="mt-4 text-lg font-bold group-hover:text-indigo-600 transition-colors">
                  {workspace.name}
                </CardTitle>
                {workspace.description && (
                  <CardDescription className="line-clamp-2 text-xs">
                    {workspace.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="text-xs text-muted-foreground pt-2 border-t flex items-center justify-between">
                  <span>
                    {workspace.createdAt
                      ? `Tạo ngày ${new Date(workspace.createdAt).toLocaleDateString("vi-VN")}`
                      : ""}
                  </span>
                  <Badge variant="outline" className="text-[10px] border-indigo-500/30 text-indigo-600">Workspace Active</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          title="Chưa có Workspace nào"
          description="Tạo workspace đầu tiên để bắt đầu quản lý dự án cùng đồng nghiệp."
          icon={Briefcase}
          action={
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Tạo Workspace đầu tiên
            </Button>
          }
        />
      )}
    </div>
  );
};
