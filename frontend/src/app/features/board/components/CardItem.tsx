import React, { useEffect, useState, useRef } from "react";
import { useDrag, useDrop } from "react-dnd";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cardsApi } from "../../../api/cards.api";
import { attachmentsApi, type Attachment } from "../../../api/attachments.api";
import { labelsApi } from "../../../api/labels.api";
import { commentsApi, type CardComment } from "../../../api/comments.api";
import { assigneesApi, type CardAssignee } from "../../../api/assignees.api";
import { checklistsApi, type Checklist } from "../../../api/checklists.api";
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
import {
  Calendar,
  ChevronLeft,
  Check,
  FileText,
  Link as LinkIcon,
  Plus,
  Route,
  Trash2,
  UserPlus,
} from "lucide-react";
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
  const [assigneesOpen, setAssigneesOpen] = useState(false);
  const [assigneesSelected, setAssigneesSelected] = useState<CardAssignee | null>(null);
  const [newChecklistTitle, setNewChecklistTitle] = useState("");
  const [newItemTitles, setNewItemTitles] = useState<Record<string, string>>({});
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description || "");
  const [dueAtInput, setDueAtInput] = useState<string>(card.dueAt ? card.dueAt.slice(0, 16) : "");
  const [commentDraft, setCommentDraft] = useState("");
  const [assigneeEmail, setAssigneeEmail] = useState("");
  const [activePane, setActivePane] = useState<"main" | "comments">("main");
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

  const canManageAssignees =
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

  useEffect(() => {
    // Reset when opening/closing so you don't get stuck in comments pane.
    if (!isModalOpen) setActivePane("main");
  }, [isModalOpen]);

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

  const setDueDateMutation = useMutation({
    mutationFn: (dueAt: string | null) => cardsApi.setDueDate(card.id, dueAt),
    onSuccess: (updated) => {
      const key = ["board", boardId, "detail"] as const;
      const current = queryClient.getQueryData<BoardDetail>(key);
      if (!current) return;

      const lists = current.lists.map((l) => {
        const cards = l.cards.map((c) => (c.id === updated.id ? { ...c, ...updated } : c));
        return { ...l, cards };
      });

      queryClient.setQueryData<BoardDetail>(key, { ...current, lists });
      setDueAtInput(updated.dueAt ? updated.dueAt.slice(0, 16) : "");
    },
  });

  useEffect(() => {
    if (!isModalOpen) return;

    const t = setTimeout(() => {
      const next = dueAtInput?.trim() ? new Date(dueAtInput).toISOString() : null;
      const current = card.dueAt ? card.dueAt.slice(0, 16) : "";
      if ((dueAtInput ?? "") === current) return;
      setDueDateMutation.mutate(next);
    }, 500);

    return () => clearTimeout(t);
    // Intentionally skip `card.dueAt` to avoid re-triggering after server writes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dueAtInput, isModalOpen]);

  const setDoneMutation = useMutation({
    mutationFn: (isDone: boolean) => cardsApi.setDone(card.id, isDone),
    onSuccess: (updated) => {
      const key = ["board", boardId, "detail"] as const;
      const current = queryClient.getQueryData<BoardDetail>(key);
      if (!current) return;

      const lists = current.lists.map((l) => {
        const cards = l.cards.map((c) => (c.id === updated.id ? { ...c, ...updated } : c));
        return { ...l, cards };
      });

      queryClient.setQueryData<BoardDetail>(key, { ...current, lists });
    },
  });

  const { data: commentsResp, refetch: refetchComments } = useQuery({
    queryKey: ["card", card.id, "comments"],
    queryFn: () => commentsApi.listByCard({ cardId: card.id, limit: 50 }),
    enabled: isModalOpen,
  });

  const comments = commentsResp?.comments ?? [];

  const createCommentMutation = useMutation({
    mutationFn: (content: string) => commentsApi.create({ cardId: card.id, content }),
    onSuccess: async () => {
      setCommentDraft("");
      await refetchComments();
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: string) => commentsApi.delete(commentId),
    onSuccess: async () => {
      await refetchComments();
    },
  });

  const { data: assignees = [], refetch: refetchAssignees } = useQuery({
    queryKey: ["card", card.id, "assignees"],
    queryFn: () => assigneesApi.listByCard(card.id),
    enabled: isModalOpen,
  });

  const assignSelfMutation = useMutation({
    mutationFn: () => assigneesApi.assignSelf(card.id),
    onSuccess: async () => {
      await refetchAssignees();
    },
  });

  const unassignSelfMutation = useMutation({
    mutationFn: () => assigneesApi.unassignSelf(card.id),
    onSuccess: async () => {
      await refetchAssignees();
    },
  });

  const addByAdminMutation = useMutation({
    mutationFn: async (email: string) => {
      const members = boardDetail?.members ?? [];
      const target = members.find((m: any) => (m.user?.email ?? m.email) === email);
      if (!target) throw new Error("Member not found in this board");
      return assigneesApi.addByAdmin(card.id, target.userId);
    },
    onSuccess: async () => {
      setAssigneeEmail("");
      await refetchAssignees();
    },
  });

  const kickByAdminMutation = useMutation({
    mutationFn: (userId: string) => assigneesApi.kickByAdmin(card.id, userId),
    onSuccess: async () => {
      await refetchAssignees();
    },
  });

  const myUserId = (boardDetail as any)?.actor?.userId as string | undefined;
  const isMeAssigned = Boolean(myUserId && (assignees || []).some((a: CardAssignee) => a.id === myUserId));

  const { data: checklistsResp, refetch: refetchChecklists } = useQuery({
    queryKey: ["card", card.id, "checklists"],
    queryFn: () => checklistsApi.listByCard(card.id),
    enabled: isModalOpen,
  });

  const checklists = checklistsResp?.checklists ?? [];

  const createChecklistMutation = useMutation({
    mutationFn: (title: string) => checklistsApi.createChecklist(card.id, { title }),
    onSuccess: async () => {
      setNewChecklistTitle("");
      await refetchChecklists();
    },
  });

  const deleteChecklistMutation = useMutation({
    mutationFn: (checklistId: string) => checklistsApi.deleteChecklist(checklistId),
    onSuccess: async () => {
      await refetchChecklists();
    },
  });

  const createItemMutation = useMutation({
    mutationFn: ({ checklistId, title }: { checklistId: string; title: string }) =>
      checklistsApi.createItem(checklistId, { title }),
    onSuccess: async (_item, vars) => {
      setNewItemTitles((m) => ({ ...m, [vars.checklistId]: "" }));
      await refetchChecklists();
    },
  });

  const toggleItemMutation = useMutation({
    mutationFn: ({ itemId, isDone }: { itemId: string; isDone: boolean }) =>
      checklistsApi.updateItem(itemId, { isDone }),
    onSuccess: async () => {
      await refetchChecklists();
      queryClient.invalidateQueries({ queryKey: ["board", boardId, "detail"] });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: (itemId: string) => checklistsApi.deleteItem(itemId),
    onSuccess: async () => {
      await refetchChecklists();
      queryClient.invalidateQueries({ queryKey: ["board", boardId, "detail"] });
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
        {/* Trello-like label bars */}
        <div className="mb-2 flex h-2 flex-wrap gap-1">
          {(card.labels || []).slice(0, 5).map((label) => (
            <span
              key={label.id}
              className="h-2 w-10 rounded"
              style={{ backgroundColor: label.color || "#64748B" }}
              title={label.name}
            />
          ))}
        </div>

        <div className="flex items-start justify-between gap-2">
          <p className="text-sm leading-5">{card.title}</p>
        </div>

        {(card.dueAt || (card.checklistTotal ?? 0) > 0 || card.isDone) ? (
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {card.isDone ? (
              <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-1 text-emerald-700">
                <Check className="h-3 w-3" />
                Done
              </span>
            ) : null}
            {card.dueAt ? (
              <span className="rounded bg-muted px-2 py-1">
                {new Date(card.dueAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            ) : null}

            {(card.checklistTotal ?? 0) > 0 ? (
              <span className="rounded bg-muted px-2 py-1">
                ✓ {card.checklistDone ?? 0}/{card.checklistTotal ?? 0}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Card Detail Modal */}
      <Dialog
        open={isModalOpen}
        onOpenChange={(open) => {
          setIsModalOpen(open);
          if (!open && forceOpen) onForceClose?.();
        }}
      >
        <DialogContent className={activePane === "comments" ? "sm:max-w-5xl" : "sm:max-w-2xl"}>
          <div className="flex max-h-[85vh] flex-col">
            <DialogHeader className="shrink-0">
              <DialogTitle>Chi tiết</DialogTitle>
            </DialogHeader>

            <div className="min-h-0 flex-1 overflow-hidden">
              <div className="flex h-full">
                {/* Main pane */}
                <div
                  className={`min-w-0 flex-1 overflow-y-auto pr-1 ${
                    activePane === "comments" ? "hidden md:block" : "block"
                  }`}
                >
                  <div className="space-y-4 pb-4">
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
                <Label>Ngày đến hạn</Label>
                {setDueDateMutation.isPending ? (
                  <div className="text-xs text-muted-foreground">Đang lưu…</div>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <Input
                  type="datetime-local"
                  value={dueAtInput}
                  onChange={(e) => setDueAtInput(e.target.value)}
                />
              </div>
              {card.dueAt ? (
                <div className="text-xs text-muted-foreground">Đang đặt: {new Date(card.dueAt).toLocaleString("vi-VN")}</div>
              ) : (
                <div className="text-xs text-muted-foreground">Chưa đặt ngày đến hạn.</div>
              )}
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
                <Label>Checklist</Label>
              </div>

              <div className="flex items-center gap-2">
                <Input
                  value={newChecklistTitle}
                  onChange={(e) => setNewChecklistTitle(e.target.value)}
                  placeholder="Tạo checklist mới..."
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    const t = newChecklistTitle.trim();
                    if (!t) return;
                    createChecklistMutation.mutate(t);
                  }}
                  disabled={createChecklistMutation.isPending}
                >
                  Tạo
                </Button>
              </div>

              {checklists.length === 0 ? (
                <div className="text-sm text-muted-foreground">Chưa có checklist.</div>
              ) : (
                <div className="space-y-3">
                  {checklists.map((cl: Checklist) => {
                    const items = cl.items ?? [];
                    const done = items.filter((i) => i.isDone).length;
                    return (
                      <div key={cl.id} className="rounded-md border p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold">{cl.title}</div>
                            <div className="text-xs text-muted-foreground">
                              {done}/{items.length} đã xong
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteChecklistMutation.mutate(cl.id)}
                            disabled={deleteChecklistMutation.isPending}
                          >
                            Xoá
                          </Button>
                        </div>

                        <div className="mt-3 space-y-2">
                          {items.length === 0 ? (
                            <div className="text-sm text-muted-foreground">Chưa có item.</div>
                          ) : (
                            items.map((it) => (
                              <div key={it.id} className="flex items-center justify-between gap-2">
                                <label className="flex min-w-0 flex-1 items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={it.isDone}
                                    onChange={(e) => toggleItemMutation.mutate({ itemId: it.id, isDone: e.target.checked })}
                                  />
                                  <span className={`truncate text-sm ${it.isDone ? "line-through text-muted-foreground" : ""}`}>
                                    {it.title}
                                  </span>
                                </label>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteItemMutation.mutate(it.id)}
                                  disabled={deleteItemMutation.isPending}
                                >
                                  Xoá
                                </Button>
                              </div>
                            ))
                          )}

                          <div className="flex items-center gap-2">
                            <Input
                              value={newItemTitles[cl.id] ?? ""}
                              onChange={(e) => setNewItemTitles((m) => ({ ...m, [cl.id]: e.target.value }))}
                              placeholder="Thêm item..."
                            />
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={() => {
                                const t = (newItemTitles[cl.id] ?? "").trim();
                                if (!t) return;
                                createItemMutation.mutate({ checklistId: cl.id, title: t });
                              }}
                              disabled={createItemMutation.isPending}
                            >
                              Add
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
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

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Thành viên</Label>
                <Button type="button" size="sm" variant="outline" onClick={() => setAssigneesOpen(true)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {(assignees || []).length === 0 ? (
                <div className="text-sm text-muted-foreground">Chưa có ai được giao.</div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {(assignees || []).map((a: CardAssignee) => (
                    <button
                      key={a.id}
                      type="button"
                      className="h-8 w-8 overflow-hidden rounded-full border bg-muted"
                      title={a.displayName}
                      onClick={() => setAssigneesSelected(a)}
                    >
                      {a.avatarUrl ? (
                        <img src={a.avatarUrl} alt={a.displayName} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs font-semibold">
                          {(a.displayName || a.email || "?").slice(0, 1).toUpperCase()}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Dialog open={Boolean(assigneesSelected)} onOpenChange={(o) => (!o ? setAssigneesSelected(null) : null)}>
              <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                  <DialogTitle>Thông tin</DialogTitle>
                </DialogHeader>
                {assigneesSelected ? (
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 overflow-hidden rounded-full border bg-muted">
                      {assigneesSelected.avatarUrl ? (
                        <img
                          src={assigneesSelected.avatarUrl}
                          alt={assigneesSelected.displayName}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-sm font-semibold">
                          {(assigneesSelected.displayName || assigneesSelected.email || "?")
                            .slice(0, 1)
                            .toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{assigneesSelected.displayName}</div>
                      <div className="truncate text-sm text-muted-foreground">{assigneesSelected.email}</div>
                    </div>
                  </div>
                ) : null}
              </DialogContent>
            </Dialog>

            <Dialog open={assigneesOpen} onOpenChange={setAssigneesOpen}>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Thành viên</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-md border px-3 py-2">
                    <div className="text-sm">Bạn</div>
                    {isMeAssigned ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => unassignSelfMutation.mutate()}
                        disabled={unassignSelfMutation.isPending}
                      >
                        Rời card
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="default"
                        onClick={() => assignSelfMutation.mutate()}
                        disabled={assignSelfMutation.isPending}
                      >
                        Tham gia
                      </Button>
                    )}
                  </div>

                  {canManageAssignees ? (
                    <div className="space-y-2">
                      <Label>Add member (OWNER/ADMIN)</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          value={assigneeEmail}
                          onChange={(e) => setAssigneeEmail(e.target.value)}
                          placeholder="Email member để add..."
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => {
                            const email = assigneeEmail.trim();
                            if (!email) return;
                            addByAdminMutation.mutate(email);
                          }}
                          disabled={addByAdminMutation.isPending}
                          title="Add by admin"
                        >
                          <UserPlus className="h-4 w-4" />
                        </Button>
                      </div>
                      {addByAdminMutation.isError ? (
                        <div className="text-xs text-red-600">Không tìm thấy member trong board theo email này.</div>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="space-y-2">
                    <Label>Đang được giao</Label>
                    {(assignees || []).length === 0 ? (
                      <div className="text-sm text-muted-foreground">Chưa có ai được giao.</div>
                    ) : (
                      <div className="space-y-2">
                        {(assignees || []).map((a: CardAssignee) => (
                          <div key={a.id} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
                            <div className="min-w-0">
                              <div className="truncate text-sm font-medium">{a.displayName}</div>
                              <div className="truncate text-xs text-muted-foreground">{a.email}</div>
                            </div>
                            {canManageAssignees ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => kickByAdminMutation.mutate(a.id)}
                                disabled={kickByAdminMutation.isPending}
                              >
                                Remove
                              </Button>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <button
              type="button"
              className="w-full rounded-md border px-3 py-2 text-left transition-colors hover:bg-muted"
              onClick={() => setActivePane("comments")}
            >
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Comments</div>
                <div className="text-xs text-muted-foreground">{comments.length}</div>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">Bấm để xem và viết comment</div>
            </button>

            <AttachmentsDialog
              open={attachmentsOpen}
              onOpenChange={setAttachmentsOpen}
              boardId={boardId}
              cardId={card.id}
              boardDetail={boardDetail}
              onCreated={() => refetchAttachments()}
            />

                  </div>
                </div>

                {/* Comments pane */}
                <div
                  className={`h-full w-full shrink-0 overflow-y-auto border-l pl-3 pr-1 md:w-90 ${
                    activePane === "comments" ? "block" : "hidden"
                  }`}
                >
                  <div className="flex items-center gap-2 py-2">
                    <Button type="button" variant="ghost" size="sm" onClick={() => setActivePane("main")}> 
                      <ChevronLeft className="h-4 w-4" />
                      Quay lại
                    </Button>
                    <div className="text-sm font-semibold">Comments</div>
                  </div>

                  <div className="space-y-3 pb-4">
                    <div className="flex gap-2">
                      <Input
                        value={commentDraft}
                        onChange={(e) => setCommentDraft(e.target.value)}
                        placeholder="Viết comment..."
                      />
                      <Button
                        type="button"
                        onClick={() => {
                          const content = commentDraft.trim();
                          if (!content) return;
                          createCommentMutation.mutate(content);
                        }}
                        disabled={createCommentMutation.isPending}
                      >
                        Gửi
                      </Button>
                    </div>

                    {comments.length === 0 ? (
                      <div className="text-sm text-muted-foreground">Chưa có comment nào.</div>
                    ) : (
                      <div className="space-y-2">
                        {comments.map((c: CardComment) => (
                          <div key={c.id} className="rounded-md border px-3 py-2">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="text-sm font-medium">{c.author?.displayName}</div>
                                <div className="text-xs text-muted-foreground">
                                  {new Date(c.createdAt).toLocaleString("vi-VN")}
                                </div>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteCommentMutation.mutate(c.id)}
                                disabled={deleteCommentMutation.isPending}
                              >
                                Xoá
                              </Button>
                            </div>
                            <div className="mt-2 whitespace-pre-wrap text-sm">{c.content}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="shrink-0 border-t pt-3">
              <div className="flex justify-between">
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
                    type="button"
                    size="sm"
                    variant={card.isDone ? "secondary" : "outline"}
                    onClick={() => setDoneMutation.mutate(!Boolean(card.isDone))}
                    disabled={setDoneMutation.isPending}
                    title="Hoàn thành"
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                    Huỷ
                  </Button>
                  <Button onClick={handleSave} disabled={updateCardMutation.isPending}>
                    Lưu thay đổi
                  </Button>
                </div>
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
