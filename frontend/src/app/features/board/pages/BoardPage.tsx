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
import type { BoardDetail } from "../../../types/api";

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
    onMutate: async (vars) => {
      if (!boardId) return;
      const key = ["board", boardId, "detail"] as const;
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<BoardDetail>(key);
      if (!previous) return { previous };

      const tempId = `temp:list:${crypto.randomUUID()}`;
      const ordered = [...previous.lists].sort((a, b) => a.position - b.position);
      const maxPos = ordered.length ? ordered[ordered.length - 1].position : 0;

      const optimisticList = {
        id: tempId,
        name: vars.name,
        boardId,
        position: maxPos + 1024,
        cards: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      queryClient.setQueryData<BoardDetail>(key, {
        ...previous,
        lists: [...previous.lists, optimisticList],
      });

      return { previous, tempId };
    },
    onError: (error: any, _vars, ctx) => {
      if (!boardId) return;
      const key = ["board", boardId, "detail"] as const;
      if (ctx?.previous) queryClient.setQueryData(key, ctx.previous);
      toast.error(error.response?.data?.error?.message || "Không thể tạo list");
    },
    onSuccess: (created, _vars, ctx) => {
      if (!boardId) return;
      const key = ["board", boardId, "detail"] as const;
      const current = queryClient.getQueryData<BoardDetail>(key);
      if (!current) return;

      // Replace temp list with real list from server
      const lists = current.lists
        .map((l) => (l.id === ctx?.tempId ? { ...created, cards: [] } : l))
        .sort((a, b) => a.position - b.position)
        .map((l, idx) => ({ ...l, position: (idx + 1) * 1024 }));

      queryClient.setQueryData<BoardDetail>(key, { ...current, lists });
      toast.success("List đã được tạo!");
    },
  });

  const handleCreateList = (name: string) => {
    if (boardId) {
      createListMutation.mutate({ name, boardId });
    }
  };

  const moveListMutation = useMutation({
    mutationFn: ({ listId, prevId, nextId }: { listId: string; prevId: string | null; nextId: string | null }) =>
      listsApi.move(listId, { prevListId: prevId ?? undefined, nextListId: nextId ?? undefined }),
    onMutate: async ({ listId, prevId, nextId }) => {
      if (!boardId) return;
      const key = ["board", boardId, "detail"] as const;
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<BoardDetail>(key);

      if (!previous) return { previous };

      const lists = [...previous.lists].sort((a, b) => a.position - b.position);
      const fromIndex = lists.findIndex((l) => l.id === listId);
      if (fromIndex < 0) return { previous };

      const targetIndex = nextId
        ? Math.max(0, lists.findIndex((l) => l.id === nextId))
        : prevId
        ? Math.min(lists.length - 1, lists.findIndex((l) => l.id === prevId) + 1)
        : 0;

      const [moved] = lists.splice(fromIndex, 1);
      lists.splice(targetIndex, 0, moved);

      // Reassign local positions so UI order is stable (server will compute real positions too)
      const normalized = lists.map((l, idx) => ({ ...l, position: (idx + 1) * 1024 }));

      queryClient.setQueryData<BoardDetail>(key, {
        ...previous,
        lists: normalized,
      });

      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (!boardId) return;
      const key = ["board", boardId, "detail"] as const;
      if (ctx?.previous) queryClient.setQueryData(key, ctx.previous);
    },
    onSuccess: () => {
      if (!boardId) return;
      queryClient.invalidateQueries({ queryKey: ["board", boardId, "detail"] });
    },
  });

  const commitListDrop = (dragListId: string) => {
    if (!boardId) return;
    const key = ["board", boardId, "detail"] as const;
    const current = queryClient.getQueryData<BoardDetail>(key);
    if (!current) return;

    const ordered = [...current.lists].sort((a, b) => a.position - b.position);
    const index = ordered.findIndex((l) => l.id === dragListId);
    if (index < 0) return;

    const prevId = index > 0 ? ordered[index - 1].id : null;
    const nextId = index < ordered.length - 1 ? ordered[index + 1].id : null;

    moveListMutation.mutate({ listId: dragListId, prevId, nextId });
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-linear-to-br from-blue-400 to-purple-500">
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
          <div className="h-full overflow-x-auto overflow-y-hidden">
            <div className="flex h-full w-max min-w-full gap-4 p-6">
            {boardDetail.lists
              .sort((a, b) => a.position - b.position)
              .map((list) => (
                <ListColumn
                  key={list.id}
                  list={list}
                  boardId={boardId!}
                  onListDropCommit={(dragListId) => commitListDrop(dragListId)}
                />
              ))}
            <AddListButton onAdd={handleCreateList} />
            </div>
          </div>
        </ScrollArea>
      </div>
    </DndProvider>
  );
};
