import React, { useState, useRef } from "react";
import { useDrag, useDrop } from "react-dnd";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cardsApi } from "../../../api/cards.api";
import { attachmentsApi, type Attachment } from "../../../api/attachments.api";
import { labelsApi } from "../../../api/labels.api";
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
};

interface CardItemProps {
  card: Card;
  listId: string;
  boardId: string;
  onCardDropped?: (dragCardId: string, hoverCardId: string, hoverAbove: boolean) => void;
}

export const CardItem: React.FC<CardItemProps> = ({
  card,
  listId,
  boardId,
  onCardDropped,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description || "");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkTitle, setLinkTitle] = useState("");
  const queryClient = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);

  const boardDetail = queryClient.getQueryData<BoardDetail>([
    "board",
    boardId,
    "detail",
  ]);
  const workspaceLabels = boardDetail?.labels ?? [];

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

  const isLabelAttached = (labelId: string) => cardLabels.some((l) => l.id === labelId);

  const { data: attachments = [], refetch: refetchAttachments } = useQuery({
    queryKey: ["card", card.id, "attachments"],
    queryFn: () => attachmentsApi.listByCard(card.id),
    enabled: isModalOpen,
  });

  const uploadAttachmentMutation = useMutation({
    mutationFn: (file: File) => attachmentsApi.uploadFileToCard(card.id, file),
    onSuccess: async () => {
      await refetchAttachments();
    },
  });

  const createLinkAttachmentMutation = useMutation({
    mutationFn: (data: { linkUrl: string; linkTitle?: string }) => attachmentsApi.createLink(card.id, data),
    onSuccess: async () => {
      setLinkUrl("");
      setLinkTitle("");
      await refetchAttachments();
    },
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
                <div className="text-xs text-muted-foreground">
                  {cardLabels.length} attached
                </div>
              </div>

              {workspaceLabels.length === 0 ? (
                <div className="text-sm text-muted-foreground">Workspace chưa có label nào.</div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {workspaceLabels.map((l) => {
                    const attached = isLabelAttached(l.id);
                    return (
                      <button
                        key={l.id}
                        type="button"
                        className={
                          "rounded px-2 py-1 text-xs text-white transition-opacity hover:opacity-90 " +
                          (attached ? "ring-2 ring-black/20" : "opacity-70")
                        }
                        style={{ backgroundColor: l.color || "#64748B" }}
                        onClick={() => {
                          if (attached) {
                            detachLabelMutation.mutate(l.id);
                          } else {
                            attachLabelMutation.mutate(l.id);
                          }
                        }}
                        disabled={attachLabelMutation.isPending || detachLabelMutation.isPending}
                        title={attached ? "Click để gỡ" : "Click để gắn"}
                      >
                        {l.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Attachments</Label>
                <div className="text-xs text-muted-foreground">{attachments.length} files/links</div>
              </div>

              <div className="flex flex-col gap-2 rounded-md border p-3">
                <div className="flex items-center gap-2">
                  <Input
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="Paste link (https://...)"
                  />
                  <Button
                    variant="secondary"
                    type="button"
                    disabled={!linkUrl.trim() || createLinkAttachmentMutation.isPending}
                    onClick={() =>
                      createLinkAttachmentMutation.mutate({
                        linkUrl: linkUrl.trim(),
                        linkTitle: linkTitle.trim() || undefined,
                      })
                    }
                  >
                    Add link
                  </Button>
                </div>

                <Input
                  value={linkTitle}
                  onChange={(e) => setLinkTitle(e.target.value)}
                  placeholder="(Optional) Link title"
                />

                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) uploadAttachmentMutation.mutate(f);
                      e.currentTarget.value = "";
                    }}
                    disabled={uploadAttachmentMutation.isPending}
                  />
                  <div className="text-xs text-muted-foreground">
                    {uploadAttachmentMutation.isPending ? "Uploading..." : ""}
                  </div>
                </div>
              </div>

              {attachments.length === 0 ? (
                <div className="text-sm text-muted-foreground">Chưa có attachment nào.</div>
              ) : (
                <div className="space-y-2">
                  {attachments.map((a) => (
                    <div key={a.id} className="flex items-center justify-between rounded border px-3 py-2">
                      <div className="min-w-0">
                        {a.type === "LINK" ? (
                          <a
                            href={a.linkUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block truncate text-sm underline"
                          >
                            {a.linkTitle || a.linkUrl}
                          </a>
                        ) : (
                          <button
                            type="button"
                            className="block truncate text-left text-sm underline"
                            onClick={() => downloadAttachment(a)}
                          >
                            {a.fileName || a.objectKey || a.id}
                          </button>
                        )}
                        <div className="text-xs text-muted-foreground">{a.type}</div>
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
