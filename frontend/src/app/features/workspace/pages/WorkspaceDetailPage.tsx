import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { workspacesApi } from "../../../api/workspaces.api";
import { boardsApi } from "../../../api/boards.api";
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
import { Plus, LayoutDashboard, Users, ArrowLeft, Trash2 } from "lucide-react";
// toast placeholder (wire real toast later)
import { MemberTable } from "../components/MemberTable";
import { ConfirmDialog } from "../../../components/shared/ConfirmDialog";
import { useWorkspaceMutations } from "../../../hooks/useWorkspaceMutations";
import { AddWorkspaceMemberCard } from "../components/AddWorkspaceMemberCard";

export const WorkspaceDetailPage: React.FC = () => {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isCreateBoardDialogOpen, setIsCreateBoardDialogOpen] = useState(false);
  const [confirmDeleteWorkspace, setConfirmDeleteWorkspace] = useState(false);
  const [newBoardName, setNewBoardName] = useState("");
  const [newBoardDescription, setNewBoardDescription] = useState("");

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

  const createBoardMutation = useMutation({
    mutationFn: boardsApi.create,
    onSuccess: (createdBoard) => {
      queryClient.invalidateQueries({
        queryKey: ["workspace", workspaceId, "boards"],
      });
      setIsCreateBoardDialogOpen(false);
      setNewBoardName("");
      setNewBoardDescription("");
      // toast: created

      if (createdBoard?.id) {
        navigate(`/boards/${createdBoard.id}`);
      }
    },
    onError: (error: any) => {
      console.error(
        error.response?.data?.error?.message || "Tạo board thất bại"
      );
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
          Quay lại Workspaces
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{workspace.name}</h1>
            {workspace.description && (
              <p className="mt-2 text-gray-600">{workspace.description}</p>
            )}
          </div>

          <Button
            variant="destructive"
            onClick={() => setConfirmDeleteWorkspace(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Xoá workspace
          </Button>
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
            <div className="text-center">Đang tải boards...</div>
          ) : boards && boards.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {boards.map((board) => (
                <Card
                  key={board.id}
                  className="cursor-pointer transition-shadow hover:shadow-lg"
                  onClick={() => navigate(`/boards/${board.id}`)}
                  style={{
                    backgroundColor: board.backgroundColor || undefined,
                  }}
                >
                  <CardHeader>
                    <CardTitle>{board.name}</CardTitle>
                    {board.description && (
                      <CardDescription className="line-clamp-2">
                        {board.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-gray-500">
                      {board.privacy === "PRIVATE" ? "Riêng tư" : "Workspace"}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <LayoutDashboard className="mb-4 h-12 w-12 text-gray-400" />
                <h3 className="mb-2 text-lg font-semibold">
                  Chưa có board nào
                </h3>
                <p className="mb-4 text-center text-sm text-gray-600">
                  Tạo board đầu tiên để bắt đầu quản lý công việc
                </p>
                <Button onClick={() => setIsCreateBoardDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Tạo Board đầu tiên
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="members" className="mt-6">
          {membersLoading ? (
            <div className="text-center">Đang tải thành viên...</div>
          ) : (
            <div className="space-y-4">
              <AddWorkspaceMemberCard workspaceId={workspaceId!} existingMembers={members || []} />
              {members && members.length > 0 ? (
                <MemberTable members={members} workspaceId={workspaceId!} />
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
    </div>
  );
};
