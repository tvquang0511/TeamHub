import React from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { boardsApi } from "../../../api/boards.api";
import { listsApi } from "../../../api/lists.api";
import { BoardHeader } from "../components/BoardHeader";
import { ListColumn } from "../components/ListColumn";
import { AddListButton } from "../components/AddListButton";
import { ScrollArea } from "../../../components/ui/scroll-area";
import { toast } from "sonner";

export const BoardPage: React.FC = () => {
  const { boardId } = useParams<{ boardId: string }>();
  const queryClient = useQueryClient();

  const { data: boardDetail, isLoading } = useQuery({
    queryKey: ["board", boardId, "detail"],
    queryFn: () => boardsApi.getDetail(boardId!),
    enabled: !!boardId,
    refetchInterval: 30000, // Refresh every 30 seconds for real-time feel
  });

  const createListMutation = useMutation({
    mutationFn: listsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board", boardId, "detail"] });
      toast.success("List đã được tạo!");
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.error?.message || "Không thể tạo list"
      );
    },
  });

  const handleCreateList = (name: string) => {
    if (boardId) {
      createListMutation.mutate({ name, boardId });
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-blue-400 to-purple-500">
        <div className="text-lg text-white">Đang tải board...</div>
      </div>
    );
  }

  if (!boardDetail) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">Không tìm thấy board</div>
      </div>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div
        className="flex h-[calc(100vh-3.5rem)] flex-col"
        style={{
          background: boardDetail.backgroundColor
            ? boardDetail.backgroundColor
            : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        }}
      >
        <BoardHeader board={boardDetail} />

        <ScrollArea className="flex-1">
          <div className="flex h-full gap-4 p-6">
            {boardDetail.lists
              .sort((a, b) => a.position - b.position)
              .map((list) => (
                <ListColumn key={list.id} list={list} boardId={boardId!} />
              ))}
            <AddListButton onAdd={handleCreateList} />
          </div>
        </ScrollArea>
      </div>
    </DndProvider>
  );
};
