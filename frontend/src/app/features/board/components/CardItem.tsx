import React, { useState, useRef } from "react";
import { useDrag, useDrop } from "react-dnd";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cardsApi } from "../../../api/cards.api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Textarea } from "../../../components/ui/textarea";
import { Label } from "../../../components/ui/label";
import { Calendar, Trash2 } from "lucide-react";
// toast placeholder (wire real toast later)
import type { BoardDetail, Card } from "../../../types/api";
import { ConfirmDialog } from "../../../components/shared/ConfirmDialog";

type CardDnDItem = {
  id: string;
  listId: string;
  targetListId?: string;
};

interface CardItemProps {
  card: Card;
  listId: string;
  boardId: string;
  onCardReorderUI?: (dragCardId: string, hoverCardId: string, hoverFraction?: number) => void;
}

export const CardItem: React.FC<CardItemProps> = ({
  card,
  listId,
  boardId,
  onCardReorderUI,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description || "");
  const queryClient = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);

  const [{ isDragging }, drag] = useDrag(() => ({
    type: "CARD",
    item: { id: card.id, listId } satisfies CardDnDItem,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  const getHoverFraction = (monitor: any): number => {
    const ref = cardRef.current;
    if (!ref) return 0;
    const clientOffset = monitor.getClientOffset();
    if (!clientOffset) return 0;
    const rect = ref.getBoundingClientRect();
    const hoverClientY = clientOffset.y - rect.top;
    return hoverClientY / (rect.bottom - rect.top);
  };

  const [{ isOver }, drop] = useDrop(() => ({
    accept: "CARD",
    hover: (item: CardDnDItem, monitor) => {
      if (item.id === card.id) return;
      if (!onCardReorderUI) return;

      const hoverFraction = getHoverFraction(monitor);

      // Same-list reorder should only happen after crossing halfway.
      // Cross-list insert can preview immediately (it avoids "card disappears" feel).
      if (item.listId === listId && hoverFraction < 0.5) return;

      onCardReorderUI(item.id, card.id, hoverFraction);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver({ shallow: true }),
    }),
  }));

  const updateCardMutation = useMutation({
    mutationFn: (data: { title?: string; description?: string }) =>
      cardsApi.update(card.id, data),
    onMutate: async (data) => {
      const key = ["board", boardId, "detail"] as const;
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<BoardDetail>(key);
      if (!previous) return { previous };

      const lists = previous.lists.map((l) => {
        if (l.id !== listId) return l;
        const cards = l.cards.map((c) =>
          c.id === card.id
            ? {
                ...c,
                title: data.title ?? c.title,
                description: data.description ?? c.description,
                updatedAt: new Date().toISOString(),
              }
            : c
        );
        return { ...l, cards };
      });

      queryClient.setQueryData<BoardDetail>(key, { ...previous, lists });
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      const key = ["board", boardId, "detail"] as const;
      if (ctx?.previous) queryClient.setQueryData(key, ctx.previous);
    },
    onSuccess: (updated) => {
      const key = ["board", boardId, "detail"] as const;
      const current = queryClient.getQueryData<BoardDetail>(key);
      if (!current) return;

      const lists = current.lists.map((l) => {
        if (l.id !== updated.listId) return l;
        const cards = l.cards.map((c) => (c.id === updated.id ? { ...c, ...updated } : c));
        return { ...l, cards };
      });

      queryClient.setQueryData<BoardDetail>(key, { ...current, lists });
      // toast: updated
    },
  });

  const deleteCardMutation = useMutation({
    mutationFn: () => cardsApi.delete(card.id),
    onMutate: async () => {
      const key = ["board", boardId, "detail"] as const;
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<BoardDetail>(key);
      if (!previous) return { previous };

      // Keep the cursor card visible until the new server ordering arrives.
      // This avoids the "card jumped away" feel during cross-list moves.
      const nextLists = previous.lists.map((l) => {
        if (l.id !== listId) return l;
        return {
          ...l,
          cards: l.cards.filter((c) => c.id !== card.id),
        };
      });

      queryClient.setQueryData<BoardDetail>(key, { ...previous, lists: nextLists });
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      const key = ["board", boardId, "detail"] as const;
      if (ctx?.previous) queryClient.setQueryData(key, ctx.previous);
    },
    onSuccess: () => {
      // toast: deleted
      setConfirmDelete(false);
    },
  });

  const handleSave = () => {
    if (title.trim()) {
      updateCardMutation.mutate({
        title: title !== card.title ? title : undefined,
        description: description !== card.description ? description : undefined,
      });
      setIsModalOpen(false);
    }
  };

  return (
    <>
      <div
        ref={(node) => {
          drop(node);
          drag(node);
          cardRef.current = node;
        }}
        onClick={() => setIsModalOpen(true)}
        className={`cursor-pointer rounded-md bg-white p-3 shadow-sm transition-shadow hover:shadow-md ${
          isDragging ? "opacity-50" : ""
        } ${isOver ? "ring-2 ring-blue-400" : ""}
        }`}
      >
        <p className="text-sm">{card.title}</p>
        {card.dueDate && (
          <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
            <Calendar className="h-3 w-3" />
            {new Date(card.dueDate).toLocaleDateString("vi-VN")}
          </div>
        )}
        {card.labels && card.labels.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {card.labels.map((label) => (
              <span
                key={label.id}
                className="rounded px-2 py-0.5 text-xs text-white"
                style={{ backgroundColor: label.color }}
              >
                {label.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Card Detail Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Chi tiết Card</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cardTitle">Tiêu đề</Label>
              <Input
                id="cardTitle"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Tiêu đề card..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cardDescription">Mô tả</Label>
              <Textarea
                id="cardDescription"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Thêm mô tả chi tiết..."
                rows={6}
              />
            </div>

            <div className="flex justify-between pt-4">
              <Button
                variant="destructive"
                onClick={() => setConfirmDelete(true)}
                disabled={deleteCardMutation.isPending}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Xoá card
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                >
                  Huỷ
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={updateCardMutation.isPending}
                >
                  Lưu thay đổi
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Xoá card?"
        description="Card sẽ bị ẩn (archive). Bạn có thể khôi phục sau (tính năng tương lai)."
        confirmText="Xoá"
        destructive
        loading={deleteCardMutation.isPending}
        onConfirm={() => deleteCardMutation.mutate()}
      />
    </>
  );
};
