import React, { useEffect, useState, useRef } from "react";
import { useDrag, useDrop } from "react-dnd";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cardsApi } from "../../../api/cards.api";
import { attachmentsApi, type Attachment } from "../../../api/attachments.api";
import { labelsApi } from "../../../api/labels.api";
import { LabelsPopover } from "./LabelsPopover";
import { AttachmentsDialog } from "./AttachmentsDialog";
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
import { Calendar, FileText, Link as LinkIcon, Route, Trash2 } from "lucide-react";
// toast placeholder (wire real toast later)
import type { BoardDetail, Card } from "../../../types/api";
import { ConfirmDialog } from "../../../components/shared/ConfirmDialog";

type CardDnDItem = {
  id: string;
  listId: string;
};

interface CardItemProps {
  card: Card;
  listId: string;
  boardId: string;
  forceOpen?: boolean;
  onForceClose?: () => void;
  onCardDropped?: (dragCardId: string, hoverCardId: string, hoverAbove: boolean) => void;
}

export const CardItem: React.FC<CardItemProps> = ({
  card,
  listId,
  boardId,
  forceOpen,
  onForceClose,
  onCardDropped,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [attachmentsOpen, setAttachmentsOpen] = useState(false);
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description || "");
  const queryClient = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);

  const boardDetail = queryClient.getQueryData<BoardDetail>([
    "board",
    boardId,
    "detail",
  ]);
  const boardLabels = boardDetail?.labels ?? [];
  const canCreateLabels =
    boardDetail?.actor?.boardRole === "OWNER" ||
    boardDetail?.actor?.boardRole === "ADMIN";

  const { data: cardLabels = [], refetch: refetchCardLabels } = useQuery({
    queryKey: ["card", card.id, "labels"],
    queryFn: () => labelsApi.listByCard(card.id),
    enabled: isModalOpen,
  });

  const attachLabelMutation = useMutation({
    mutationFn: (labelId: string) => labelsApi.attachToCard(card.id, labelId),
    onSuccess: async () => {
      await refetchCardLabels();
      queryClient.invalidateQueries({ queryKey: ["board", boardId, "detail"] });
    },
  });

  const detachLabelMutation = useMutation({
    mutationFn: (labelId: string) => labelsApi.detachFromCard(card.id, labelId),
    onSuccess: async () => {
      await refetchCardLabels();
      queryClient.invalidateQueries({ queryKey: ["board", boardId, "detail"] });
    },
  });

  const { data: attachments = [], refetch: refetchAttachments } = useQuery({
    queryKey: ["card", card.id, "attachments"],
    queryFn: () => attachmentsApi.listByCard(card.id),
    enabled: isModalOpen,
  });


  const deleteAttachmentMutation = useMutation({
    mutationFn: (attachmentId: string) => attachmentsApi.delete(attachmentId),
    onSuccess: async () => {
      await refetchAttachments();
    },
  });

  const downloadAttachment = async (att: Attachment) => {
    if (att.type !== "FILE") return;
    const presign = await attachmentsApi.presignDownload(att.id);
    window.open(presign.downloadUrl, "_blank", "noopener,noreferrer");
  };

  const [{ isDragging }, drag] = useDrag(() => ({
    type: "CARD",
    item: { id: card.id, listId } satisfies CardDnDItem,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  useEffect(() => {
    if (forceOpen) setIsModalOpen(true);
  }, [forceOpen]);

  const [{ isOver }, drop] = useDrop(() => ({
    accept: "CARD",
    drop: (item: CardDnDItem, monitor) => {
      // Only trigger on actual drop, not hover
      if (item.id === card.id) return;
      if (!onCardDropped) return;

      const ref = cardRef.current;
      if (!ref) return;

      const clientOffset = monitor.getClientOffset();
      if (!clientOffset) return;

      const rect = ref.getBoundingClientRect();
      const hoverAbove = clientOffset.y - rect.top < rect.height / 2;

      onCardDropped(item.id, card.id, hoverAbove);
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
        className={`cursor-pointer rounded-md bg-white p-2 shadow-sm transition-shadow hover:shadow-md ${
          isDragging ? "opacity-50" : ""
        } ${isOver ? "ring-2 ring-blue-400" : ""}
        }`}
      >
        <p className="text-sm leading-5">{card.title}</p>
        {card.dueDate && (
          <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
            <Calendar className="h-3 w-3" />
            {new Date(card.dueDate).toLocaleDateString("vi-VN")}
          </div>
        )}
        {/* Trello-like label bars (fixed height so tile size stays consistent) */}
        <div className="mt-1 flex h-2 flex-wrap gap-1">
          {(card.labels || []).slice(0, 5).map((label) => (
            <span
              key={label.id}
              className="h-2 w-10 rounded"
              style={{ backgroundColor: label.color || "#64748B" }}
              title={label.name}
            />
          ))}
        </div>
      </div>

      {/* Card Detail Modal */}
      <Dialog
        open={isModalOpen}
        onOpenChange={(open) => {
          setIsModalOpen(open);
          if (!open && forceOpen) onForceClose?.();
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Chi tiết</DialogTitle>
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

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Labels</Label>
                <LabelsPopover
                  boardId={boardId}
                  cardId={card.id}
                  boardLabels={boardLabels}
                  attachedLabels={cardLabels}
                  disabled={attachLabelMutation.isPending || detachLabelMutation.isPending}
                  canCreate={canCreateLabels}
                  onToggle={(labelId, nextAttached) => {
                    if (nextAttached) attachLabelMutation.mutate(labelId);
                    else detachLabelMutation.mutate(labelId);
                  }}
                />
              </div>

              {cardLabels.length === 0 ? (
                <div className="text-sm text-muted-foreground">Chưa gắn label nào.</div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {cardLabels.map((l) => (
                    <span
                      key={l.id}
                      className="rounded px-2 py-1 text-xs text-white"
                      style={{ backgroundColor: l.color || "#64748B" }}
                    >
                      {l.name}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Attachments</Label>
                <Button type="button" variant="secondary" size="sm" onClick={() => setAttachmentsOpen(true)}>
                  Add
                </Button>
              </div>

              {attachments.length === 0 ? (
                <div className="text-sm text-muted-foreground">Chưa có attachment nào.</div>
              ) : (
                <div className="space-y-2">
                  {attachments.map((a) => (
                    <div key={a.id} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
                      <div className="flex min-w-0 items-start gap-2">
                        <div className="mt-0.5 rounded bg-muted p-1">
                          {a.type === "FILE" ? (
                            <FileText className="h-4 w-4" />
                          ) : a.type === "LINK" ? (
                            <LinkIcon className="h-4 w-4" />
                          ) : (
                            <Route className="h-4 w-4" />
                          )}
                        </div>

                        <div className="min-w-0">
                          {a.type === "FILE" ? (
                            <button
                              type="button"
                              className="block truncate text-left text-sm font-medium underline"
                              onClick={() => downloadAttachment(a)}
                              title="Download"
                            >
                              {a.fileName || a.objectKey || a.id}
                            </button>
                          ) : a.type === "LINK" ? (
                            <a
                              href={a.linkUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block truncate text-sm font-medium underline"
                              title={a.linkUrl}
                            >
                              {a.linkTitle || a.linkUrl}
                            </a>
                          ) : (
                            <button
                              type="button"
                              className="block truncate text-left text-sm font-medium underline"
                              title="Open referenced card"
                              onClick={() => {
                                const refId = a.referencedCardId;
                                if (!refId) return;
                                // Navigate to same board and open the card modal via query param
                                window.location.assign(`/boards/${boardId}?cardId=${refId}`);
                              }}
                            >
                              {a.linkTitle || "Card reference"}
                            </button>
                          )}

                          <div className="text-xs text-muted-foreground">
                            {a.type === "FILE"
                              ? "File"
                              : a.type === "LINK"
                                ? "Link"
                                : "Card"}
                          </div>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        type="button"
                        onClick={() => deleteAttachmentMutation.mutate(a.id)}
                        disabled={deleteAttachmentMutation.isPending}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <AttachmentsDialog
              open={attachmentsOpen}
              onOpenChange={setAttachmentsOpen}
              boardId={boardId}
              cardId={card.id}
              boardDetail={boardDetail}
              onCreated={() => refetchAttachments()}
            />

            <div className="flex justify-between pt-4">
              <Button
                variant="destructive"
                onClick={() => setConfirmDelete(true)}
                disabled={deleteCardMutation.isPending}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Xoá thẻ
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
