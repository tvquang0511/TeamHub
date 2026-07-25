import React, { useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { workspacesApi } from "../../../api/workspaces.api";
import { boardsApi } from "../../../api/boards.api";
import { boardBackgroundToCss } from "../../../api/boards.api";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import { LayoutDashboard, Users, Trash2, Plus, BarChart3, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { MemberTable } from "../components/MemberTable";
import { ConfirmDialog } from "../../../components/shared/ConfirmDialog";
import { ConfirmTypeDialog } from "../../../components/shared/ConfirmTypeDialog";
import { useWorkspaceMutations } from "../../../hooks/useWorkspaceMutations";
import { AddWorkspaceMemberCard } from "../components/AddWorkspaceMemberCard";
import { useAuth } from "../../../providers/AuthProvider";
import { EmptyState } from "../../../components/shared/EmptyState";

export const WorkspaceDetailPage: React.FC = () => {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isCreateBoardDialogOpen, setIsCreateBoardDialogOpen] = useState(false);
  const [confirmDeleteWorkspace, setConfirmDeleteWorkspace] = useState(false);
  const [confirmDeleteBoard, setConfirmDeleteBoard] = useState<{ open: boolean; boardId?: string; boardName?: string }>(
    { open: false }
  );
  const [newBoardName, setNewBoardName] = useState("");
  const [newBoardDescription, setNewBoardDescription] = useState("");
  const backgroundFileInputRef = useRef<HTMLInputElement | null>(null);

  const workspaceMutations = useWorkspaceMutations({ workspaceId });

  const { data: workspace, isLoading: workspaceLoading } = useQuery({
    queryKey: ["workspace", workspaceId],
    queryFn: () => workspacesApi.getById(workspaceId!),
    enabled: !!workspaceId,
  });

  const { data: boards, isLoading: boardsLoading } = useQuery({
    queryKey: ["workspace", workspaceId, "boards"],
    queryFn: () => workspacesApi.getBoards(workspaceId!),
    enabled: !!workspaceId,
  });

  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: ["workspace", workspaceId, "members"],
    queryFn: () => workspacesApi.getMembers(workspaceId!),
    enabled: !!workspaceId,
  });

  const myWorkspaceRole = (members || []).find((m: any) => m.userId && user?.id && m.userId === user.id)?.role;
  const canManageWorkspace = myWorkspaceRole === "OWNER" || myWorkspaceRole === "ADMIN";

  const createBoardMutation = useMutation({
    mutationFn: boardsApi.create,
    onSuccess: (createdBoard) => {
      queryClient.invalidateQueries({
        queryKey: ["workspace", workspaceId, "boards"],
      });
      setIsCreateBoardDialogOpen(false);
      setNewBoardName("");
      setNewBoardDescription("");
  toast.success("Đã tạo board!");

      if (createdBoard?.id) {
        navigate(`/boards/${createdBoard.id}`);
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || "Tạo board thất bại");
    },
  });

  const deleteBoardMutation = useMutation({
    mutationFn: (boardId: string) => boardsApi.delete(boardId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["workspace", workspaceId, "boards"] });
      toast.success("Đã xoá board");
      setConfirmDeleteBoard({ open: false });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || "Không thể xoá board");
    },
  });

  const backgroundMutation = useMutation({
    mutationFn: async (file: File) => {
      const upload = await workspacesApi.initBackgroundUpload(workspaceId!, {
        fileName: file.name,
        contentType: file.type,
      });

      await fetch(upload.uploadUrl, {
        method: "PUT",
        headers: {
          ...(upload.headers || {}),
        },
        body: file,
      });

      return workspacesApi.commitBackgroundUpload(workspaceId!, { objectKey: upload.objectKey });
    },
    onSuccess: (ws) => {
      queryClient.setQueryData(["workspace", workspaceId], ws);
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      toast.success("Đã cập nhật ảnh nền workspace");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || "Không thể cập nhật ảnh nền");
    },
  });

  const handleCreateBoard = (e: React.FormEvent) => {
    e.preventDefault();
    createBoardMutation.mutate({
      name: newBoardName,
      workspaceId: workspaceId!,
      description: newBoardDescription || undefined,
      privacy: "WORKSPACE",
    });
  };

  if (workspaceLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-lg">Đang tải workspace...</div>
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-lg">Không tìm thấy workspace</div>
      </div>
    );
  }

  const onPickBackground: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    backgroundMutation.mutate(file);
    e.currentTarget.value = "";
  };

  const deleteWorkspace = () => {
    if (!workspaceId) return;
    workspaceMutations.deleteWorkspace.mutate(workspaceId, {
      onSuccess: () => {
        setConfirmDeleteWorkspace(false);

        // keep UI snappy: remove from cache right away
        queryClient.setQueryData<any>(["workspaces"], (prev: any) => {
          if (!Array.isArray(prev)) return prev;
          return prev.filter((w: any) => w.id !== workspaceId);
        });
        queryClient.removeQueries({ queryKey: ["workspace", workspaceId] });
        queryClient.removeQueries({ queryKey: ["workspace", workspaceId, "boards"] });
        queryClient.removeQueries({ queryKey: ["workspace", workspaceId, "members"] });

        navigate("/workspaces");
      },
    });
  };

  return (
    <div className="container mx-auto max-w-7xl py-8">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/workspaces")}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Workspaces
        </Button>

        <div className="overflow-hidden rounded-lg border bg-muted">
          <div
            className="h-44 w-full bg-cover bg-center"
            style={
              workspace.backgroundImageUrl
                ? { backgroundImage: `url(${workspace.backgroundImageUrl})` }
                : undefined
            }
          />
          <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h1 className="truncate text-3xl font-bold">{workspace.name}</h1>
              {workspace.description ? (
                <p className="mt-2 text-gray-600">{workspace.description}</p>
              ) : null}
            </div>

            <div className="flex items-center gap-2">
              {canManageWorkspace ? (
                <>
                  <Button
                    variant="secondary"
                    type="button"
                    onClick={() => navigate(`/workspaces/${workspaceId}/analytics`)}
                    className="bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 border border-amber-500/30"
                  >
                    <BarChart3 className="mr-2 h-4 w-4 text-amber-600" />
                    Báo cáo Workspace
                  </Button>
                  <Button
                    variant="outline"
                    type="button"
                    disabled={backgroundMutation.isPending}
                    onClick={() => backgroundFileInputRef.current?.click()}
                  >
                    {backgroundMutation.isPending ? "Đang upload…" : "Đổi ảnh nền"}
                  </Button>
                  <input
                    ref={backgroundFileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    className="hidden"
                    onChange={onPickBackground}
                    disabled={backgroundMutation.isPending}
                  />
                </>
              ) : null}

              <Button
                variant="destructive"
                onClick={() => {
                  if (!canManageWorkspace) {
                    toast.error("Bạn không đủ quyền để xoá workspace");
                    return;
                  }
                  setConfirmDeleteWorkspace(true);
                }}
                className={!canManageWorkspace ? "opacity-50" : undefined}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Xoá workspace
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="boards" className="w-full">
        <TabsList>
          <TabsTrigger value="boards">
            <LayoutDashboard className="mr-2 h-4 w-4" />
            Boards
          </TabsTrigger>
          <TabsTrigger value="members">
            <Users className="mr-2 h-4 w-4" />
            Thành viên
          </TabsTrigger>
        </TabsList>

        <TabsContent value="boards" className="mt-6">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Boards</h2>
            <Dialog
              open={isCreateBoardDialogOpen}
              onOpenChange={setIsCreateBoardDialogOpen}
            >
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Tạo Board
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleCreateBoard}>
                  <DialogHeader>
                    <DialogTitle>Tạo Board mới</DialogTitle>
                    <DialogDescription>
                      Board là nơi bạn tổ chức công việc thành các lists và cards
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="boardName">Tên board</Label>
                      <Input
                        id="boardName"
                        placeholder="VD: Sprint Planning"
                        value={newBoardName}
                        onChange={(e) => setNewBoardName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="boardDescription">Mô tả (tuỳ chọn)</Label>
                      <Textarea
                        id="boardDescription"
                        placeholder="Mô tả ngắn về board này..."
                        value={newBoardDescription}
                        onChange={(e) =>
                          setNewBoardDescription(e.target.value)
                        }
                        rows={3}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsCreateBoardDialogOpen(false)}
                    >
                      Huỷ
                    </Button>
                    <Button type="submit" disabled={createBoardMutation.isPending}>
                      {createBoardMutation.isPending ? "Đang tạo..." : "Tạo"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {boardsLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="h-36 rounded-xl bg-muted/60 animate-pulse border border-border/40" />
              <div className="h-36 rounded-xl bg-muted/60 animate-pulse border border-border/40" />
              <div className="h-36 rounded-xl bg-muted/60 animate-pulse border border-border/40" />
            </div>
          ) : boards && boards.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {boards.map((board) => (
                (() => {
                  const canReadBoard = board.actor?.canReadBoard ?? true;
                  const isLockedPrivate = board.privacy === "PRIVATE" && !canReadBoard;
                  const canDeleteBoard = board.actor?.canDeleteBoard ?? false;

                  return (
                    <Card
                      key={board.id}
                      className={`relative cursor-pointer transition-all hover:shadow-lg ${
                        isLockedPrivate ? "opacity-60 cursor-not-allowed" : ""
                      }`}
                      onClick={() => {
                        if (isLockedPrivate) {
                          toast.error("Board này ở chế độ Private. Bạn cần được thêm vào làm member của Board để truy cập.");
                          return;
                        }
                        navigate(`/boards/${board.id}`);
                      }}
                    >
                      <div
                        className="h-20 w-full rounded-t-lg bg-cover bg-center"
                        style={{
                          background:
                            boardBackgroundToCss(board) ??
                            "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                        }}
                      />
                      <CardHeader className="pt-3">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="line-clamp-1">{board.name}</CardTitle>
                          {canDeleteBoard ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-red-500"
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirmDeleteBoard({
                                  open: true,
                                  boardId: board.id,
                                  boardName: board.name,
                                });
                              }}
                              title="Xoá board"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          ) : null}
                        </div>
                        {board.description && (
                          <CardDescription className="line-clamp-2">
                            {board.description}
                          </CardDescription>
                        )}
                      </CardHeader>
                      <CardContent>
                        <div className="text-xs text-muted-foreground">
                          {board.privacy === "PRIVATE" ? "🔒 Private" : "🌐 Workspace Public"}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })()
              ))}
            </div>
          ) : (
            <EmptyState
              title="Chưa có Board nào trong Workspace này"
              description="Tạo Board đầu tiên để bắt đầu quản lý công việc và phân công nhiệm vụ."
              icon={LayoutDashboard}
              action={
                <Button onClick={() => setIsCreateBoardDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Tạo Board đầu tiên
                </Button>
              }
            />
          )}
        </TabsContent>

        <TabsContent value="members" className="mt-6">
          {membersLoading ? (
            <div className="text-center">Đang tải thành viên...</div>
          ) : (
            <div className="space-y-4">
              <AddWorkspaceMemberCard
                workspaceId={workspaceId!}
                existingMembers={members || []}
                canManage={canManageWorkspace}
              />
              {members && members.length > 0 ? (
                <MemberTable members={members} workspaceId={workspaceId!} canManage={canManageWorkspace} />
              ) : (
                <Card className="border-dashed">
                  <CardContent className="py-12 text-center text-sm text-gray-600">
                    Workspace chưa có thành viên nào.
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={confirmDeleteWorkspace}
        onOpenChange={setConfirmDeleteWorkspace}
        title="Xoá workspace?"
        description="Workspace sẽ bị xoá khỏi tài khoản của bạn. Hành động này không thể hoàn tác."
        confirmText="Xoá"
        destructive
        loading={workspaceMutations.deleteWorkspace.isPending}
        onConfirm={deleteWorkspace}
      />

      <ConfirmTypeDialog
        open={confirmDeleteBoard.open}
        onOpenChange={(open) => setConfirmDeleteBoard((prev) => ({ ...prev, open }))}
        title={confirmDeleteBoard.boardName ? `Xoá board \"${confirmDeleteBoard.boardName}\"?` : "Xoá board?"}
        description="Hành động này không thể hoàn tác. Vui lòng gõ delete để xác nhận."
        expectedText="delete"
        confirmText="Xoá"
        destructive
        loading={deleteBoardMutation.isPending}
        onConfirm={() => {
          if (!confirmDeleteBoard.boardId) return;
          deleteBoardMutation.mutate(confirmDeleteBoard.boardId);
        }}
      />
    </div>
  );
};
