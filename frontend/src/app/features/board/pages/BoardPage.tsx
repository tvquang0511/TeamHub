import React, { useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { boardsApi } from "../../../api/boards.api";
import { boardBackgroundToCss } from "../../../api/boards.api";
import { listsApi } from "../../../api/lists.api";
import { BoardHeader, type ViewMode } from "../components/BoardHeader";
import { BoardFilterBar, type BoardFilterState } from "../components/BoardFilterBar";
import { BoardTimelineView } from "../components/BoardTimelineView";
import { BoardTableView } from "../components/BoardTableView";
import { ListColumn } from "../components/ListColumn";
import { AddListButton } from "../components/AddListButton";
import { ScrollArea, ScrollBar } from "../../../components/ui/scroll-area";
import { toast } from "sonner";
import type { BoardDetail, Card } from "../../../types/api";
import { BoardChatPanel } from "../components/BoardChatPanel";
import { Sheet, SheetContent, SheetTrigger } from "../../../components/ui/sheet";
import { Button } from "../../../components/ui/button";
import { MessageCircle } from "lucide-react";
import { useAuth } from "../../../providers/AuthProvider";

import { BoardSkeleton } from "../../../components/shared/BoardSkeleton";

export const BoardPage: React.FC = () => {
  const { boardId } = useParams<{ boardId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedCardId = searchParams.get("cardId") || "";
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [chatOpen, setChatOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");

  const [filters, setFilters] = useState<BoardFilterState>({
    search: "",
    onlyMyCards: false,
    assigneeIds: [],
    labelIds: [],
    dueDate: "all",
  });

  const openCardModal = (cardId: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("cardId", cardId);
    setSearchParams(next, { replace: true });
  };

  const { data: boardDetail, isLoading } = useQuery({
    queryKey: ["board", boardId, "detail"],
    queryFn: () => boardsApi.getDetail(boardId!),
    enabled: !!boardId,
    refetchInterval: 30000, // Refresh every 30 seconds for real-time feel
  });

  const filteredBoardDetail = React.useMemo(() => {
    if (!boardDetail) return undefined;

    const filterCard = (card: Card) => {
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const matchTitle = card.title.toLowerCase().includes(q);
        const matchDesc = card.description?.toLowerCase().includes(q);
        if (!matchTitle && !matchDesc) return false;
      }

      if (filters.onlyMyCards && user?.id) {
        const isAssignedToMe = card.assignees?.some(
          (a: any) => a.userId === user.id || a.id === user.id || a.user?.id === user.id
        );
        if (!isAssignedToMe) return false;
      }

      if (filters.assigneeIds.length > 0) {
        const hasAssignee = card.assignees?.some((a: any) =>
          filters.assigneeIds.includes(a.userId || a.id || a.user?.id)
        );
        if (!hasAssignee) return false;
      }

      if (filters.labelIds.length > 0) {
        const hasLabel = card.labels?.some((l) => filters.labelIds.includes(l.id));
        if (!hasLabel) return false;
      }

      if (filters.dueDate !== "all") {
        if (filters.dueDate === "no_due") {
          if (card.dueAt) return false;
        } else {
          if (!card.dueAt) return false;
          const due = new Date(card.dueAt);
          const now = new Date();

          if (filters.dueDate === "overdue") {
            if (due >= now || card.isDone) return false;
          } else if (filters.dueDate === "due_today") {
            const isToday =
              due.getDate() === now.getDate() &&
              due.getMonth() === now.getMonth() &&
              due.getFullYear() === now.getFullYear();
            if (!isToday) return false;
          } else if (filters.dueDate === "due_this_week") {
            const diffDays = (due.getTime() - now.getTime()) / (1000 * 3600 * 24);
            if (diffDays < 0 || diffDays > 7) return false;
          }
        }
      }

      return true;
    };

    const filteredLists = boardDetail.lists.map((l) => ({
      ...l,
      cards: l.cards.filter(filterCard),
    }));

    return {
      ...boardDetail,
      lists: filteredLists,
    };
  }, [boardDetail, filters, user]);

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
    if (!canWriteBoard) return;
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

  const commitListDrop = (
    dragListId: string,
    dropTargetListId: string,
    intent: "before" | "after" = "before",
  ) => {
    if (!canWriteBoard) return;
    if (!boardId) return;
    const key = ["board", boardId, "detail"] as const;
    const current = queryClient.getQueryData<BoardDetail>(key);
    if (!current) return;

    // Compute prev/next based on *drop target* + intent (before/after).
    // This makes list behavior match card drop semantics and avoids no-op moves.
    const ordered = [...current.lists].sort((a, b) => a.position - b.position);
    const dragged = ordered.find((l) => l.id === dragListId);
    if (!dragged) return;

    const withoutDragged = ordered.filter((l) => l.id !== dragListId);
    const targetIndex = withoutDragged.findIndex((l) => l.id === dropTargetListId);
    if (targetIndex < 0) return;

    const insertIndex = intent === "after" ? targetIndex + 1 : targetIndex;
    withoutDragged.splice(insertIndex, 0, dragged);
    const nextOrdered = withoutDragged;

    const index = nextOrdered.findIndex((l) => l.id === dragListId);
    if (index < 0) return;

    const prevId = index > 0 ? nextOrdered[index - 1].id : null;
    const nextId = index < nextOrdered.length - 1 ? nextOrdered[index + 1].id : null;

    moveListMutation.mutate({ listId: dragListId, prevId, nextId });
  };

  if (isLoading) {
    return <BoardSkeleton />;
  }

  if (!boardDetail) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">Không tìm thấy board</div>
      </div>
    );
  }

  const canWriteBoard = boardDetail.actor?.canWriteBoard ?? true;

  const clearSelectedCard = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("cardId");
    setSearchParams(next, { replace: true });
  };

  const activeBoard = filteredBoardDetail || boardDetail;

  return (
    <DndProvider backend={HTML5Backend}>
      <div
        className="flex h-[calc(100vh-3.5rem)] flex-col"
        style={{
          background:
            boardBackgroundToCss(boardDetail) ??
            "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        }}
      >
        <BoardHeader
          board={boardDetail}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />

        <BoardFilterBar
          board={boardDetail}
          filters={filters}
          onFilterChange={setFilters}
        />

        {viewMode === "kanban" ? (
          <div className="flex min-h-0 flex-1">
            <ScrollArea className="min-w-0 flex-1">
              <div className="h-full w-max">
                <div className="flex h-full gap-4 p-6">
                  {activeBoard.lists
                    .sort((a, b) => a.position - b.position)
                    .map((list) => (
                      <ListColumn
                        key={list.id}
                        list={list}
                        boardId={boardId!}
                        onListDropCommit={commitListDrop}
                        selectedCardId={selectedCardId}
                        onCloseSelectedCard={clearSelectedCard}
                        canWrite={canWriteBoard}
                      />
                    ))}
                  <AddListButton onAdd={handleCreateList} canWrite={canWriteBoard} />
                </div>
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>
        ) : viewMode === "timeline" ? (
          <div className="flex-1 min-h-0 p-2">
            <BoardTimelineView board={activeBoard} onCardClick={openCardModal} />
          </div>
        ) : (
          <div className="flex-1 min-h-0 p-2">
            <BoardTableView board={activeBoard} onCardClick={openCardModal} />
          </div>
        )}

        <Sheet open={chatOpen} onOpenChange={setChatOpen}>
          <SheetTrigger asChild>
            <div className="fixed right-6 bottom-6 z-40">
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="size-12 rounded-full border shadow-sm"
                aria-label="Chat"
              >
                <MessageCircle className="size-6" />
              </Button>
            </div>
          </SheetTrigger>
          <SheetContent side="right" className="p-0">
            <BoardChatPanel board={boardDetail} variant="sheet" onOpenCard={openCardModal} />
          </SheetContent>
        </Sheet>
      </div>
    </DndProvider>
  );
};
