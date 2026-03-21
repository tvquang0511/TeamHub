import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useDrag, useDrop } from "react-dnd";
import { listsApi } from "../../../api/lists.api";
import { cardsApi } from "../../../api/cards.api";
import { CardItem } from "./CardItem";
import { AddCardButton } from "./AddCardButton";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../../components/ui/dropdown-menu";
import { MoreHorizontal, Trash2, Edit2 } from "lucide-react";
import { toast } from "sonner";
import type { BoardDetail, List } from "../../../types/api";
import { ConfirmDialog } from "../../../components/shared/ConfirmDialog";

type CardDragItem = {
  id: string;
  listId: string;
  targetListId?: string;
};

interface ListColumnProps {
  list: List;
  boardId: string;
  onListDropCommit?: (dragListId: string, dropListId: string) => void;
}

export const ListColumn: React.FC<ListColumnProps> = ({
  list,
  boardId,
  onListDropCommit,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [listName, setListName] = useState(list.name);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const queryClient = useQueryClient();

  const [{ isListDragging }, dragList] = useDrag(() => ({
    type: "LIST",
    item: { id: list.id },
    collect: (monitor) => ({
      isListDragging: monitor.isDragging(),
    }),
  }));

  const updateListMutation = useMutation({
    mutationFn: (name: string) => listsApi.update(list.id, { name }),
    onMutate: async (name: string) => {
      const key = ["board", boardId, "detail"] as const;
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<BoardDetail>(key);
      if (!previous) return { previous };

      const lists = previous.lists.map((l) =>
        l.id === list.id ? { ...l, name, updatedAt: new Date().toISOString() } : l
      );
      queryClient.setQueryData<BoardDetail>(key, { ...previous, lists });

      setIsEditing(false);
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      const key = ["board", boardId, "detail"] as const;
      if (ctx?.previous) queryClient.setQueryData(key, ctx.previous);
      toast.error("Không thể cập nhật list");
    },
    onSuccess: (updated) => {
      const key = ["board", boardId, "detail"] as const;
      const current = queryClient.getQueryData<BoardDetail>(key);
      if (!current) return;

      const lists = current.lists.map((l) => (l.id === updated.id ? { ...l, ...updated } : l));
      queryClient.setQueryData<BoardDetail>(key, { ...current, lists });
      toast.success("Đã cập nhật list!");
    },
  });

  const deleteListMutation = useMutation({
    mutationFn: () => listsApi.delete(list.id),
    onMutate: async () => {
      const key = ["board", boardId, "detail"] as const;
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<BoardDetail>(key);
      if (!previous) return { previous };

      const lists = previous.lists.filter((l) => l.id !== list.id);
      queryClient.setQueryData<BoardDetail>(key, { ...previous, lists });
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      const key = ["board", boardId, "detail"] as const;
      if (ctx?.previous) queryClient.setQueryData(key, ctx.previous);
      toast.error("Không thể xoá list");
    },
    onSuccess: () => {
      toast.success("Đã xoá list!");
      setConfirmDelete(false);
    },
  });

  const moveCardMutation = useMutation({
    mutationFn: ({ cardId, data }: { cardId: string; data: any }) =>
      cardsApi.move(cardId, data),
    onMutate: async ({ cardId, data }) => {
      const key = ["board", boardId, "detail"] as const;
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<BoardDetail>(key);
      if (!previous) return { previous };

      const destinationListId = data?.toListId ?? list.id;
      const nextLists = previous.lists.map((l) => {
        const ordered = [...l.cards].sort((a, b) => a.position - b.position);
        if (l.id === list.id) {
          const cards = ordered.filter((c) => c.id !== cardId);
          return { ...l, cards };
        }
        if (l.id === destinationListId) {
          const card = previous.lists.flatMap((x) => x.cards).find((c) => c.id === cardId);
          if (!card) return l;
          const cards = ordered.filter((c) => c.id !== cardId);
          const inserted = [...cards, { ...card, listId: destinationListId }];
          return { ...l, cards: inserted };
        }
        return l;
      });

      queryClient.setQueryData<BoardDetail>(key, { ...previous, lists: nextLists });
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      const key = ["board", boardId, "detail"] as const;
      if (ctx?.previous) queryClient.setQueryData(key, ctx.previous);
      toast.error("Không thể di chuyển card");
    },
  });

  const sortedCards = [...list.cards].sort((a, b) => a.position - b.position);

  const reorderCardsUI = (dragCardId: string, hoverCardId: string, hoverFraction?: number) => {
    const key = ["board", boardId, "detail"] as const;
    const current = queryClient.getQueryData<BoardDetail>(key);
    if (!current) return;

    // Find source list (where the card currently is in UI)
    const sourceList = current.lists.find((l) => l.cards.some((c) => c.id === dragCardId));
    if (!sourceList) return;

    const targetListId = list.id;
    const hoverIndexInTarget = (() => {
      const target = current.lists.find((l) => l.id === targetListId);
      if (!target) return -1;
      const ordered = [...target.cards].sort((a, b) => a.position - b.position);
      return ordered.findIndex((c) => c.id === hoverCardId);
    })();
    if (hoverIndexInTarget < 0) return;

    const movedCard = sourceList.cards.find((c) => c.id === dragCardId);
    if (!movedCard) return;

    // Apply 50% threshold: insert after if hovering bottom half
    const insertAfter = hoverFraction !== undefined && hoverFraction >= 0.5;
    const adjustedIndex = insertAfter ? hoverIndexInTarget + 1 : hoverIndexInTarget;

    const lists = current.lists.map((l) => {
      const ordered = [...l.cards].sort((a, b) => a.position - b.position);

      // Remove from source
      if (l.id === sourceList.id) {
        const filtered = ordered.filter((c) => c.id !== dragCardId);
        const normalized = filtered.map((c, idx) => ({ ...c, position: (idx + 1) * 1024 }));
        return { ...l, cards: normalized };
      }

      // Insert into target
      if (l.id === targetListId) {
        const without = ordered.filter((c) => c.id !== dragCardId);
        const toIndex = Math.max(0, Math.min(adjustedIndex, without.length));
        const inserted = [...without];
        inserted.splice(toIndex, 0, { ...movedCard, listId: targetListId });
        const normalized = inserted.map((c, idx) => ({ ...c, position: (idx + 1) * 1024 }));
        return { ...l, cards: normalized };
      }

      return l;
    });

    queryClient.setQueryData<BoardDetail>(key, { ...current, lists });
  };

  const commitCardDrop = (dragCardId: string) => {
    const key = ["board", boardId, "detail"] as const;
    const current = queryClient.getQueryData<BoardDetail>(key);
    if (!current) return;

    // Recompute from fresh state to ensure prev/next are correct
    const targetList = current.lists.find((l) => l.id === list.id);
    if (!targetList) return;
    
    const ordered = [...targetList.cards]
      .filter((c) => !c.id.startsWith("temp:"))
      .sort((a, b) => a.position - b.position);
    
    const index = ordered.findIndex((c) => c.id === dragCardId);
    if (index < 0) return;

    const prevId = index > 0 ? ordered[index - 1].id : null;
    const nextId = index < ordered.length - 1 ? ordered[index + 1].id : null;

    moveCardMutation.mutate({
      cardId: dragCardId,
      data: {
        toListId: list.id,
        prevCardId: prevId,
        nextCardId: nextId,
      },
    });
  };

  // End-of-list drop zone (allows "drop to end" without hovering a card)
  const [{ isOverEnd }, dropEnd] = useDrop(() => ({
    accept: "CARD",
    hover: (item: CardDragItem) => {
      // If dragging from another list, show it appended at end while hovering the end zone.
      if (item.id == null) return;
      if (item.listId !== list.id) {
        item.targetListId = list.id;
      }

      const key = ["board", boardId, "detail"] as const;
      const current = queryClient.getQueryData<BoardDetail>(key);
      if (!current) return;
      const source = current.lists.find((l) => l.cards.some((c) => c.id === item.id));
      if (!source) return;
      const movedCard = source.cards.find((c) => c.id === item.id);
      if (!movedCard) return;

      const lists = current.lists.map((l) => {
        const ordered = [...l.cards].sort((a, b) => a.position - b.position);
        if (l.id === source.id) {
          const filtered = ordered.filter((c) => c.id !== item.id);
          const normalized = filtered.map((c, idx) => ({ ...c, position: (idx + 1) * 1024 }));
          return { ...l, cards: normalized };
        }
        if (l.id === list.id) {
          const without = ordered.filter((c) => c.id !== item.id);
          const appended = [...without, { ...movedCard, listId: list.id }];
          const normalized = appended.map((c, idx) => ({ ...c, position: (idx + 1) * 1024 }));
          return { ...l, cards: normalized };
        }
        return l;
      });

      queryClient.setQueryData<BoardDetail>(key, { ...current, lists });
    },
    drop: (item: CardDragItem, monitor) => {
      const didDrop = monitor.didDrop();
      if (didDrop) return;
      commitCardDrop(item.id);
    },
    collect: (monitor) => ({
      isOverEnd: monitor.isOver({ shallow: true }),
    }),
  }));

  const [{ isOverCard }, dropCard] = useDrop(() => ({
    accept: "CARD",
    drop: (item: { id: string; listId: string; targetListId?: string }, monitor) => {
      const didDrop = monitor.didDrop();
      if (didDrop) return;

      // Commit on drop
      commitCardDrop(item.id);
    },
    collect: (monitor) => ({
      isOverCard: monitor.isOver({ shallow: true }),
    }),
  }));

  const [{ isOverList }, dropList] = useDrop(() => ({
    accept: "LIST",
    drop: (item: { id: string }) => {
      if (!onListDropCommit) return;
      if (item.id === list.id) return;
      onListDropCommit(item.id, list.id);
    },
    collect: (monitor) => ({
      isOverList: monitor.isOver({ shallow: true }),
    }),
  }));

  const handleSaveName = () => {
    if (listName.trim() && listName !== list.name) {
      updateListMutation.mutate(listName);
    } else {
      setIsEditing(false);
      setListName(list.name);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSaveName();
    } else if (e.key === "Escape") {
      setIsEditing(false);
      setListName(list.name);
    }
  };

  return (
    <div
      ref={(node) => {
        dropList(node);
        dropCard(node);
      }}
      className={`flex h-fit min-w-70 max-w-70 flex-col rounded-lg bg-gray-100 transition-colors ${
        isOverCard ? "bg-gray-200" : ""
      } ${isOverList ? "ring-2 ring-white/60" : ""} ${
        isListDragging ? "opacity-60" : ""
      }`}
    >
      {/* List Header */}
      <div className="flex items-center justify-between gap-2 p-3">
        <div
          ref={(node) => {
            dragList(node);
          }}
          className="-ml-1 flex h-8 w-6 items-center justify-center rounded hover:bg-black/5 cursor-grab active:cursor-grabbing"
          title="Kéo để sắp xếp list"
        >
          <MoreHorizontal className="h-5 w-5 text-gray-600 rotate-90" />
        </div>
        {isEditing ? (
          <Input
            value={listName}
            onChange={(e) => setListName(e.target.value)}
            onBlur={handleSaveName}
            onKeyDown={handleKeyDown}
            autoFocus
            className="h-8 flex-1"
          />
        ) : (
          <h3
            className="flex-1 cursor-pointer font-semibold"
            onClick={() => setIsEditing(true)}
          >
            {list.name}
          </h3>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setIsEditing(true)}>
              <Edit2 className="mr-2 h-4 w-4" />
              Đổi tên
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setConfirmDelete(true)}
              className="text-red-600"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Xoá list
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-2 px-3 pb-2">
        {sortedCards.map((card) => (
          <CardItem
            key={card.id}
            card={card}
            listId={list.id}
            boardId={boardId}
            onCardReorderUI={reorderCardsUI}
          />
        ))}

        {/* Drop zone for inserting to the end of list */}
        <div
          ref={(node) => {
            dropEnd(node);
          }}
          className={`h-10 rounded-md border border-dashed transition-colors ${
            isOverEnd ? "border-blue-500 bg-blue-50" : "border-transparent"
          }`}
          title="Thả vào đây để đưa card xuống cuối list"
        />
      </div>

      {/* Add Card Button */}
      <div className="p-3 pt-0">
        <AddCardButton listId={list.id} boardId={boardId} />
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Xoá list?"
        description="List sẽ bị ẩn (archive) và các card trong list cũng sẽ bị archive."
        confirmText="Xoá"
        destructive
        loading={deleteListMutation.isPending}
        onConfirm={() => deleteListMutation.mutate()}
      />
    </div>
  );
};
