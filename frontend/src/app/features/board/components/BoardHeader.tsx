import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../../components/ui/button";
import { ArrowLeft, Users, Lock, Unlock, Palette, Tag, BarChart3, LayoutGrid, Calendar as CalendarIcon, Table as TableIcon, History, Download } from "lucide-react";
import { BoardMembersDialog } from "./BoardMembersDialog";
import { BoardBackgroundDialog } from "./BoardBackgroundDialog";
import { BoardActivityDialog } from "./BoardActivityDialog";
import { Avatar, AvatarFallback, AvatarImage } from "../../../components/ui/avatar";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { boardsApi } from "../../../api/boards.api";
import type { BoardDetail } from "../../../types/api";
import { BoardLabelsDialog } from "./BoardLabelsDialog";

export type ViewMode = "kanban" | "timeline" | "table";

interface BoardHeaderProps {
  board: BoardDetail;
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
}

export const BoardHeader: React.FC<BoardHeaderProps> = ({
  board,
  viewMode = "kanban",
  onViewModeChange,
}) => {
  const navigate = useNavigate();
  const [isMembersOpen, setIsMembersOpen] = useState(false);
  const [isBackgroundOpen, setIsBackgroundOpen] = useState(false);
  const [isLabelsOpen, setIsLabelsOpen] = useState(false);
  const [isActivityOpen, setIsActivityOpen] = useState(false);
  const queryClient = useQueryClient();

  // Best-effort permission gating:
  // - Prefer canUpdateBoardSettings (ideal)
  // - Fallback to canWriteBoard for older actor payloads
  const canToggleVisibility =
    (board.actor as any)?.canUpdateBoardSettings ?? board.actor?.canWriteBoard ?? false;
  const canUpdateBoardSettings =
    (board.actor as any)?.canUpdateBoardSettings ?? board.actor?.canWriteBoard ?? false;
  const canViewAnalytics =
    board.actor?.boardRole === "OWNER" || board.actor?.boardRole === "ADMIN";
  const visibility = board.privacy === "WORKSPACE" ? "WORKSPACE" : "PRIVATE";

  const toggleDisabledReason = useMemo(() => {
    if (canToggleVisibility) return null;
    if (board.actor?.isBoardMember === false) return "Bạn không phải thành viên của board";
    if (board.actor?.boardRole && board.actor.boardRole !== "OWNER" && board.actor.boardRole !== "ADMIN") {
      return "Chỉ OWNER/ADMIN của board mới đổi được visibility";
    }
    return "Bạn không có quyền đổi visibility của board";
  }, [board.actor, canToggleVisibility]);

  const ownerMember = useMemo(
    () => board.members?.find((m) => m.role === "OWNER"),
    [board.members]
  );

  const toggleVisibilityMutation = useMutation({
    mutationFn: async () => {
      const next = visibility === "WORKSPACE" ? "PRIVATE" : "WORKSPACE";
      return boardsApi.updateVisibility(board.id, next);
    },
    onMutate: async () => {
      // Optimistic update so the icon flips instantly.
      const next = visibility === "WORKSPACE" ? "PRIVATE" : "WORKSPACE";

      await Promise.all([
        queryClient.cancelQueries({ queryKey: ["board", board.id, "detail"] }),
        queryClient.cancelQueries({ queryKey: ["board", board.id] }),
      ]);

      const prevDetail = queryClient.getQueryData<any>(["board", board.id, "detail"]);
      const prevBoard = queryClient.getQueryData<any>(["board", board.id]);

      if (prevDetail) {
        queryClient.setQueryData(["board", board.id, "detail"], {
          ...prevDetail,
          privacy: next,
        });
      }
      if (prevBoard) {
        queryClient.setQueryData(["board", board.id], {
          ...prevBoard,
          privacy: next,
        });
      }

      return { prevDetail, prevBoard };
    },
    onError: (error: any, _vars, ctx) => {
      if (ctx?.prevDetail) queryClient.setQueryData(["board", board.id, "detail"], ctx.prevDetail);
      if (ctx?.prevBoard) queryClient.setQueryData(["board", board.id], ctx.prevBoard);

      const apiError = error.response?.data?.error;
      toast.error(
        apiError?.message
          ? `${apiError.message} (${apiError.code ?? "ERROR"})`
          : "Không thể cập nhật quyền xem board"
      );
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["board", board.id, "detail"] }),
        queryClient.invalidateQueries({ queryKey: ["board", board.id] }),
        // If workspace board list shows privacy icons/text, keep it fresh too.
        queryClient.invalidateQueries({ queryKey: ["boards", "workspace", board.workspaceId] }),
      ]);
      toast.success("Đã cập nhật quyền xem board");
    },
  });

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleExportBoard = async () => {
    try {
      toast.info("Đang xuất dữ liệu Board...");
      const data = await boardsApi.exportBoard(board.id);
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`;
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", jsonString);
      downloadAnchor.setAttribute("download", `teamhub-board-${board.name.toLowerCase().replace(/\s+/g, "-")}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      toast.success("Đã tải xuống file sao lưu Board (JSON)!");
    } catch {
      toast.error("Không thể xuất dữ liệu Board");
    }
  };

  return (
    <div className="border-b border-white/20 bg-black/10 backdrop-blur-xs">
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 gap-2 flex-wrap sm:flex-nowrap">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/workspaces/${board.workspaceId}`)}
            className="text-white hover:bg-white/20 shrink-0"
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            <span className="hidden sm:inline">Quay lại</span>
          </Button>
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-lg sm:text-xl font-bold text-white truncate max-w-[160px] sm:max-w-[260px] md:max-w-[360px] lg:max-w-[480px]" title={board.name}>
              {board.name}
            </h1>
            <Button
              variant="ghost"
              size="sm"
              className={
                "h-8 px-2 text-white hover:bg-white/20 shrink-0 " +
                (!canToggleVisibility ? "opacity-50" : "")
              }
              onClick={() => {
                if (!canToggleVisibility) {
                  toast.error(toggleDisabledReason ?? "Bạn không đủ quyền đổi visibility của board");
                  return;
                }
                toggleVisibilityMutation.mutate();
              }}
              disabled={toggleVisibilityMutation.isPending}
              title={
                !canToggleVisibility
                  ? toggleDisabledReason ?? "Bạn không có quyền đổi visibility"
                  : visibility === "WORKSPACE"
                    ? "Board đang PUBLIC trong workspace"
                    : "Board đang PRIVATE"
              }
            >
              {visibility === "WORKSPACE" ? (
                <Unlock className="h-4 w-4" />
              ) : (
                <Lock className="h-4 w-4" />
              )}
            </Button>

            {/* View Mode Switcher Segmented Control */}
            {onViewModeChange && (
              <div className="hidden sm:flex items-center gap-1 bg-black/25 p-1 rounded-full border border-white/20 ml-2 shadow-xs">
                <button
                  type="button"
                  onClick={() => onViewModeChange("kanban")}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    viewMode === "kanban"
                      ? "bg-white text-slate-900 font-bold shadow-xs"
                      : "text-white/80 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  <span>Kanban</span>
                </button>
                <button
                  type="button"
                  onClick={() => onViewModeChange("timeline")}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    viewMode === "timeline"
                      ? "bg-white text-slate-900 font-bold shadow-xs"
                      : "text-white/80 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <CalendarIcon className="h-3.5 w-3.5" />
                  <span>Timeline</span>
                </button>
                <button
                  type="button"
                  onClick={() => onViewModeChange("table")}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    viewMode === "table"
                      ? "bg-white text-slate-900 font-bold shadow-xs"
                      : "text-white/80 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <TableIcon className="h-3.5 w-3.5" />
                  <span>Bảng</span>
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Members avatars */}
          {ownerMember ? (
            <div className="flex -space-x-2">
              <Avatar className="border-2 border-white" title={`OWNER: ${ownerMember.user.displayName}`}>
                {ownerMember.user.avatarUrl ? (
                  <AvatarImage src={ownerMember.user.avatarUrl} alt={ownerMember.user.displayName} />
                ) : null}
                <AvatarFallback className="bg-blue-600 text-xs text-white">
                  {getInitials(ownerMember.user.displayName)}
                </AvatarFallback>
              </Avatar>
            </div>
          ) : null}

          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              if (!canUpdateBoardSettings) {
                toast.error("Bạn không đủ quyền để đổi màu nền board");
                return;
              }
              setIsBackgroundOpen(true);
            }}
            title="Đổi màu nền board"
            className={!canUpdateBoardSettings ? "opacity-50" : undefined}
          >
            <Palette className="mr-2 h-4 w-4" />
            Màu nền
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              if (!canUpdateBoardSettings) {
                toast.error("Bạn không đủ quyền để quản lý labels");
                return;
              }
              setIsLabelsOpen(true);
            }}
            title="Xem/Tạo labels cho board"
            className={!canUpdateBoardSettings ? "opacity-50" : undefined}
          >
            <Tag className="mr-2 h-4 w-4" />
            Labels
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              if (!canViewAnalytics) {
                toast.error("Chỉ OWNER/ADMIN mới xem được thống kê");
                return;
              }
              navigate(`/boards/${board.id}/analytics`);
            }}
            title="Xem thống kê board"
            className={!canViewAnalytics ? "opacity-50" : undefined}
          >
            <BarChart3 className="mr-2 h-4 w-4" />
            Thống kê
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportBoard}
            title="Xuất file sao lưu dữ liệu Board (JSON)"
          >
            <Download className="mr-2 h-4 w-4 text-emerald-600" />
            Xuất JSON
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsActivityOpen(true)}
            title="Xem nhật ký hoạt động trên board"
          >
            <History className="mr-2 h-4 w-4 text-primary" />
            Nhật ký
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsMembersOpen(true)}
          >
            <Users className="mr-2 h-4 w-4" />
            Thành viên
          </Button>
        </div>
      </div>

      <BoardActivityDialog
        boardId={board.id}
        open={isActivityOpen}
        onOpenChange={setIsActivityOpen}
      />

      <BoardMembersDialog
        boardId={board.id}
        workspaceId={board.workspaceId}
        open={isMembersOpen}
        onOpenChange={setIsMembersOpen}
      />

      <BoardBackgroundDialog
        board={board}
        open={isBackgroundOpen}
        onOpenChange={setIsBackgroundOpen}
      />

      <BoardLabelsDialog boardId={board.id} open={isLabelsOpen} onOpenChange={setIsLabelsOpen} />
    </div>
  );
};
