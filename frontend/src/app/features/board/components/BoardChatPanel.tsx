import { useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { toast } from "sonner";
import { FileText, FileUp, ImageUp, MoreHorizontal, Sparkles } from "lucide-react";

import { boardsApi } from "../../../api/boards.api";
import { chatAttachmentsApi, type ChatMessageAttachment } from "../../../api/chatAttachments.api";
import { getAccessToken } from "../../../api/http";
import { useAuth } from "../../../providers/AuthProvider";
import type { BoardDetail, BoardMessage } from "../../../types/api";
import { ConvertMessageToCardDialog } from "./ConvertMessageToCardDialog";
import { SOCKET_BASE_URL } from "../../../../config/env";
import { Button } from "../../../components/ui/button";
import { ScrollArea } from "../../../components/ui/scroll-area";
import { Textarea } from "../../../components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "../../../components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../../components/ui/dropdown-menu";

const EDIT_DELETE_WINDOW_MS = 20 * 60 * 1000;

type InlineImageState = {
  url: string;
  expiresAt: number;
};

const isImageMime = (mimeType: string | null | undefined) =>
  Boolean(mimeType && mimeType.toLowerCase().startsWith("image/"));

const getInitials = (name: string) => {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/g);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

type AckOk<T> = { ok: true } & T;
type AckErr = { ok: false; error: { code: string; message: string } };

type JoinAck = AckOk<Record<string, never>> | AckErr;

type SendAck = AckOk<{ message: BoardMessage }> | AckErr;

type UpdateAck = AckOk<{ message: BoardMessage }> | AckErr;

type DeleteAck = AckOk<{ ok: true }> | AckErr;

export function BoardChatPanel(props: {
  board: BoardDetail;
  variant?: "inline" | "sheet";
  onOpenCard?: (cardId: string) => void;
}) {
  const { board, onOpenCard } = props;
  const variant = props.variant ?? "inline";
  const { user } = useAuth();

  const canUseChat = !!board.actor?.isBoardMember;

  const [messages, setMessages] = useState<BoardMessage[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const [draft, setDraft] = useState("");
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);

  const [convertMessage, setConvertMessage] = useState<BoardMessage | null>(null);
  const [isConvertDialogOpen, setIsConvertDialogOpen] = useState(false);

  const boardCards = useMemo(() => {
    const list: { id: string; title: string; listName: string }[] = [];
    board.lists?.forEach((l) => {
      l.cards?.forEach((c) => {
        if (!(c as any).archivedAt) {
          list.push({ id: c.id, title: c.title, listName: l.name });
        }
      });
    });
    return list;
  }, [board.lists]);

  const cardsMap = useMemo(() => {
    const map: Record<string, string> = {};
    boardCards.forEach((c) => {
      map[c.title.toLowerCase().replace(/\s+/g, "")] = c.id;
      map[c.id.toLowerCase()] = c.id;
    });
    return map;
  }, [boardCards]);

  const hashMatch = draft.match(/#([^\s#]*)$/);
  const showCardAutocomplete = !!hashMatch;
  const cardSearchQuery = hashMatch ? hashMatch[1].toLowerCase() : "";

  const filteredAutocompleteCards = useMemo(() => {
    if (!showCardAutocomplete) return [];
    if (!cardSearchQuery) return boardCards.slice(0, 5);
    return boardCards
      .filter((c) => c.title.toLowerCase().includes(cardSearchQuery))
      .slice(0, 5);
  }, [boardCards, showCardAutocomplete, cardSearchQuery]);

  const handleSelectCardAutocomplete = (card: { id: string; title: string }) => {
    const updatedDraft = draft.replace(/#([^\s#]*)$/, `[#${card.title}](#card:${card.id}) `);
    setDraft(updatedDraft);
  };

  const [pendingUploads, setPendingUploads] = useState<
    { file: File; uploading: boolean; error?: string }[]
  >([]);
  const [composerAttachments, setComposerAttachments] = useState<ChatMessageAttachment[]>([]);

  const socketRef = useRef<Socket | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  const [inlineImageUrls, setInlineImageUrls] = useState<Record<string, InlineImageState>>({});
  const inlineImageUrlsRef = useRef<Record<string, InlineImageState>>({});

  const myUserId = user?.id ?? "";

  const sortedMessages = useMemo(() => {
    // Backend returns newest first; UI feels better oldest->newest
    const copy = [...messages];
    copy.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    return copy;
  }, [messages]);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const mergeMessage = (next: BoardMessage) => {
    setMessages((prev) => {
      const idx = prev.findIndex((m) => m.id === next.id);
      if (idx < 0) return [next, ...prev];
      const copy = [...prev];
      copy[idx] = next;
      return copy;
    });
  };

  const markDeleted = (messageId: string) => {
    setMessages((prev) => {
      const idx = prev.findIndex((m) => m.id === messageId);
      if (idx < 0) return prev;
      const current = prev[idx];
      const copy = [...prev];
      copy[idx] = {
        ...current,
        content: "",
        deletedAt: current.deletedAt ?? new Date().toISOString(),
      };
      return copy;
    });
  };

  const loadInitialHistory = async () => {
    if (!canUseChat) return;

    setIsLoadingHistory(true);
    try {
      const res = await boardsApi.listMessages(board.id, { limit: 30 });
      setMessages(res.messages);
      setNextCursor(res.nextCursor);
      // allow render then scroll
      setTimeout(scrollToBottom, 50);
    } catch (e: any) {
      toast.error(e?.response?.data?.error?.message || "Không thể tải lịch sử chat");
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const loadMore = async () => {
    if (!canUseChat) return;
    if (!nextCursor) return;

    setIsLoadingHistory(true);
    try {
      const res = await boardsApi.listMessages(board.id, { limit: 30, cursor: nextCursor });
      setMessages((prev) => [...prev, ...res.messages]);
      setNextCursor(res.nextCursor);
    } catch (e: any) {
      toast.error(e?.response?.data?.error?.message || "Không thể tải thêm tin nhắn");
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (!canUseChat) {
      setMessages([]);
      setNextCursor(null);
      setInlineImageUrls({});
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    loadInitialHistory();

    const token = getAccessToken();
    if (!token) {
      toast.error("Bạn chưa đăng nhập (thiếu access token)");
      return;
    }

    const socket = io(SOCKET_BASE_URL, {
      transports: ["websocket"],
      auth: { token },
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("board:join", { boardId: board.id }, (ack: JoinAck) => {
        if (!ack?.ok) {
          toast.error(ack?.error?.message || "Không thể tham gia phòng chat");
        }
      });
    });

    socket.on("connect_error", (err: any) => {
      const msg = typeof err?.message === "string" ? err.message : "Không thể kết nối realtime";
      if (msg === "AUTH_TOKEN_EXPIRED" || msg === "AUTH_TOKEN_INVALID") {
        toast.error("Phiên đăng nhập đã hết hạn. Hãy thử refresh hoặc đăng nhập lại.");
      } else {
        toast.error(msg);
      }
    });

    socket.on("chat:message:new", (payload: { message: BoardMessage }) => {
      if (!payload?.message) return;
      mergeMessage(payload.message);
      setTimeout(scrollToBottom, 50);
    });

    socket.on("chat:message:updated", (payload: { message: BoardMessage }) => {
      if (!payload?.message) return;
      mergeMessage(payload.message);
    });

    socket.on("chat:message:deleted", (payload: { boardId: string; messageId: string }) => {
      if (payload?.boardId !== board.id) return;
      if (!payload?.messageId) return;
      markDeleted(payload.messageId);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board.id, canUseChat]);

  useEffect(() => {
    inlineImageUrlsRef.current = inlineImageUrls;
  }, [inlineImageUrls]);

  useEffect(() => {
    if (!canUseChat) return;

    const now = Date.now();
    const ids: string[] = [];
    for (const m of messages) {
      if (!Array.isArray(m.attachments)) continue;
      for (const a of m.attachments) {
        if (isImageMime(a.mimeType)) ids.push(a.id);
      }
    }

    const uniqueIds = Array.from(new Set(ids));
    const missing = uniqueIds.filter((id) => {
      const cached = inlineImageUrlsRef.current[id];
      return !cached || cached.expiresAt <= now + 30_000;
    });

    if (!missing.length) return;

    let cancelled = false;
    (async () => {
      for (const id of missing) {
        if (cancelled) return;
        try {
          const presign = await chatAttachmentsApi.presignDownload(board.id, id, "inline");
          if (cancelled) return;
          const expiresAt = Date.now() + presign.expiresIn * 1000;
          setInlineImageUrls((prev) => ({ ...prev, [id]: { url: presign.downloadUrl, expiresAt } }));
        } catch {
          // ignore; user can still click to download
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [board.id, canUseChat, messages]);

  const isEditableByMe = (m: BoardMessage) => {
    if (!myUserId) return false;
    if (m.senderId !== myUserId) return false;
    if (m.deletedAt) return false;
    const created = new Date(m.createdAt).getTime();
    return Date.now() - created <= EDIT_DELETE_WINDOW_MS;
  };

  const startEdit = (m: BoardMessage) => {
    setEditingMessageId(m.id);
    setDraft(m.content);
  };

  const cancelEdit = () => {
    setEditingMessageId(null);
    setDraft("");
  };

  const submit = async () => {
    if (!canUseChat) {
      toast.error("Bạn không có quyền dùng chat của board này");
      return;
    }

    const socket = socketRef.current;
    if (!socket || !socket.connected) {
      toast.error("Realtime chưa kết nối");
      return;
    }

    const content = draft.trim();
    if (!editingMessageId && pendingUploads.some((u) => u.uploading)) {
      toast.error("Đang upload file, hãy đợi xíu");
      return;
    }

    const attachmentIds = composerAttachments.map((a) => a.id);

    if (editingMessageId) {
      if (!content) {
        toast.error("Nội dung tin nhắn không được trống");
        return;
      }
    } else {
      if (!content && attachmentIds.length === 0) {
        toast.error("Tin nhắn trống");
        return;
      }
    }

    if (editingMessageId) {
      socket.emit(
        "chat:message:edit",
        { boardId: board.id, messageId: editingMessageId, content },
        (ack: UpdateAck) => {
          if (!ack?.ok) {
            toast.error(ack?.error?.message || "Không thể chỉnh sửa tin nhắn");
            return;
          }
          toast.success("Đã chỉnh sửa tin nhắn");
          setEditingMessageId(null);
          setDraft("");
        },
      );
      return;
    }

    socket.emit(
      "chat:message:send",
      { boardId: board.id, content, attachmentIds },
      (ack: SendAck) => {
        if (!ack?.ok) {
          toast.error(ack?.error?.message || "Không thể gửi tin nhắn");
          return;
        }
        setDraft("");
        setComposerAttachments([]);
      },
    );
  };

  const uploadFiles = async (files: File[], kind: "file" | "image") => {
    if (!canUseChat) {
      toast.error("Bạn không có quyền dùng chat của board này");
      return;
    }

    if (editingMessageId) {
      toast.error("Không thể đính kèm khi đang chỉnh sửa");
      return;
    }

    const all = (files || []).filter(Boolean);

    const isImageFile = (f: File) => (f.type || "").toLowerCase().startsWith("image/");

    const list =
      kind === "image"
        ? all.filter((f) => isImageFile(f))
        : all.filter((f) => !isImageFile(f));

    if (!list.length) return;

    setPendingUploads((prev) => [...prev, ...list.map((f) => ({ file: f, uploading: true }))]);

    for (const file of list) {
      try {
        const attachment = await chatAttachmentsApi.uploadFileToBoardChat(board.id, file);
        setComposerAttachments((prev) => [...prev, attachment]);
      } catch (e: any) {
        const message = e?.response?.data?.error?.message || e?.message || "Upload thất bại";
        toast.error(message);
      } finally {
        setPendingUploads((prev) => {
          const idx = prev.findIndex((u) => u.file === file && u.uploading);
          if (idx < 0) return prev;
          const copy = [...prev];
          copy[idx] = { ...copy[idx], uploading: false };
          return copy;
        });
      }
    }
  };

  const downloadAttachment = async (attachmentId: string) => {
    if (!canUseChat) {
      toast.error("Bạn không có quyền dùng chat của board này");
      return;
    }

    try {
      const presign = await chatAttachmentsApi.presignDownload(board.id, attachmentId, "attachment");
      window.open(presign.downloadUrl, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      toast.error(e?.response?.data?.error?.message || "Không thể tải file");
    }
  };

  const deleteMessage = (m: BoardMessage) => {
    if (!canUseChat) {
      toast.error("Bạn không có quyền dùng chat của board này");
      return;
    }

    const socket = socketRef.current;
    if (!socket || !socket.connected) {
      toast.error("Realtime chưa kết nối");
      return;
    }

    socket.emit(
      "chat:message:delete",
      { boardId: board.id, messageId: m.id },
      (ack: DeleteAck) => {
        if (!ack?.ok) {
          toast.error(ack?.error?.message || "Không thể xoá tin nhắn");
          return;
        }
        toast.success("Đã xoá tin nhắn");
        markDeleted(m.id);
        if (editingMessageId === m.id) cancelEdit();
      },
    );
  };

  return (
    <div
      className={
        "flex min-h-0 h-full flex-col overflow-hidden bg-background/70 " +
        (variant === "inline" ? "w-88 shrink-0 border-l" : "w-full")
      }
    >
      <div className="flex items-center justify-between border-b px-3 py-2">
        <div className="text-sm font-medium">Chat</div>
        {canUseChat ? (
          <div className="text-xs text-muted-foreground"></div>
        ) : (
          <div className="text-xs text-muted-foreground">Không có quyền</div>
        )}
      </div>

      {!canUseChat ? (
        <div className="p-3 text-sm text-muted-foreground">
          Bạn không phải thành viên board nên không xem/gửi chat.
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between px-3 py-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!nextCursor || isLoadingHistory}
              onClick={loadMore}
            >
              Tải thêm
            </Button>
            <div className="text-xs text-muted-foreground">
              {isLoadingHistory ? "Đang tải..." : ""}
            </div>
          </div>

          <ScrollArea className="min-h-0 flex-1 px-3">
            <div className="space-y-3 py-2">
              {sortedMessages.map((m) => {
                const mine = m.senderId === myUserId;
                const deleted = !!m.deletedAt;
                const editable = isEditableByMe(m);
                const hasAttachments = Array.isArray(m.attachments) && m.attachments.length > 0;
                const imageAttachments = hasAttachments ? m.attachments.filter((a) => isImageMime(a.mimeType)) : [];
                const fileAttachments = hasAttachments ? m.attachments.filter((a) => !isImageMime(a.mimeType)) : [];
                const canEditMessage = editable && !hasAttachments;

                return (
                  <div key={m.id} className={mine ? "text-right" : "text-left"}>
                    <div className="text-xs text-muted-foreground">
                      {mine ? "Bạn" : m.sender.displayName}
                      {" · "}
                      {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      {m.editedAt && !deleted ? " · đã chỉnh sửa" : ""}
                    </div>

                    <div className={mine ? "mt-1 flex items-center justify-end gap-1" : "mt-1 flex items-end gap-2"}>
                      {!mine ? (
                        <Avatar className="h-7 w-7">
                          {m.sender.avatarUrl ? (
                            <AvatarImage src={m.sender.avatarUrl} alt={m.sender.displayName} />
                          ) : (
                            <AvatarFallback className="text-[10px]">
                              {getInitials(m.sender.displayName)}
                            </AvatarFallback>
                          )}
                        </Avatar>
                      ) : null}

                      {!deleted ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              aria-label="Tuỳ chọn tin nhắn"
                            >
                              <MoreHorizontal />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setConvertMessage(m);
                                setIsConvertDialogOpen(true);
                              }}
                            >
                              <Sparkles className="mr-2 h-4 w-4 text-indigo-500" />
                              Tạo Card từ tin nhắn
                            </DropdownMenuItem>
                            {mine && !hasAttachments ? (
                              <DropdownMenuItem disabled={!canEditMessage} onClick={() => startEdit(m)}>
                                Chỉnh sửa
                              </DropdownMenuItem>
                            ) : null}
                            {mine ? (
                              <DropdownMenuItem
                                variant="destructive"
                                disabled={!editable}
                                onClick={() => deleteMessage(m)}
                              >
                                Xoá
                              </DropdownMenuItem>
                            ) : null}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : null}

                      <div
                        className={
                          mine
                            ? "flex max-w-[90%] flex-col items-end gap-2"
                            : "flex max-w-[90%] flex-col items-start gap-2"
                        }
                      >
                        {deleted ? (
                          <div
                            className={
                              "inline-block rounded-md px-3 py-2 text-sm " +
                              (mine ? "bg-primary text-primary-foreground" : "bg-muted text-foreground")
                            }
                          >
                            Tin nhắn đã bị xoá
                          </div>
                        ) : m.content ? (
                          <div
                            className={
                              "inline-block rounded-md px-3 py-2 text-sm " +
                              (mine ? "bg-primary text-primary-foreground" : "bg-muted text-foreground")
                            }
                          >
                            <div className="whitespace-pre-wrap wrap-break-word">
                              {m.content.split(/(\[#[^\]]+\]\(\#card:[a-f0-9-]+\)|#[A-Za-z0-9_\-À-ỹ]+)/gi).map((part, idx) => {
                                const linkMatch = part.match(/^\[#([^\]]+)\]\(\#card:([a-f0-9-]+)\)$/i);
                                if (linkMatch) {
                                  const cardTitle = linkMatch[1];
                                  const cardId = linkMatch[2];
                                  return (
                                    <button
                                      key={idx}
                                      type="button"
                                      onClick={() => onOpenCard?.(cardId)}
                                      className="inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5 rounded-md bg-blue-500/20 text-blue-700 dark:text-blue-300 font-semibold text-xs border border-blue-500/30 hover:bg-blue-500/30 transition-colors cursor-pointer"
                                    >
                                      <span>#{cardTitle}</span>
                                    </button>
                                  );
                                }

                                const tagMatch = part.match(/^#([A-Za-z0-9_\-À-ỹ]+)$/);
                                if (tagMatch) {
                                  const tag = tagMatch[1];
                                  const matchedCardId = cardsMap[tag.toLowerCase()];
                                  return (
                                    <button
                                      key={idx}
                                      type="button"
                                      onClick={() => matchedCardId && onOpenCard?.(matchedCardId)}
                                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5 rounded-md bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-semibold text-xs border border-indigo-500/30 hover:bg-indigo-500/30 transition-colors ${
                                        matchedCardId ? "cursor-pointer" : "cursor-default"
                                      }`}
                                    >
                                      <span>#{tag}</span>
                                    </button>
                                  );
                                }

                                return part;
                              })}
                            </div>
                          </div>
                        ) : null}

                        {!deleted && hasAttachments ? (
                          <div className={mine ? "flex flex-col items-end gap-2" : "flex flex-col gap-2"}>
                            {imageAttachments.length ? (
                              <div className={mine ? "flex flex-wrap justify-end gap-2" : "flex flex-wrap gap-2"}>
                                {imageAttachments.map((a) => {
                                  const cached = inlineImageUrls[a.id];
                                  const src = cached?.url;

                                  return (
                                    <button
                                      key={a.id}
                                      type="button"
                                      className="overflow-hidden rounded-md"
                                      onClick={() => {
                                        if (src) window.open(src, "_blank", "noopener,noreferrer");
                                        else downloadAttachment(a.id);
                                      }}
                                    >
                                      {src ? (
                                        <img
                                          src={src}
                                          alt={a.fileName}
                                          className="block max-h-48 max-w-48 object-cover"
                                          loading="lazy"
                                          onError={() => {
                                            setInlineImageUrls((prev) => {
                                              const copy = { ...prev };
                                              delete copy[a.id];
                                              return copy;
                                            });
                                          }}
                                        />
                                      ) : (
                                        <div className="h-24 w-24 rounded-md bg-muted" />
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            ) : null}

                            {fileAttachments.length ? (
                              <div className={mine ? "flex flex-col items-end gap-1" : "flex flex-col gap-1"}>
                                {fileAttachments.map((a) => (
                                  <button
                                    key={a.id}
                                    type="button"
                                    className="flex w-fit max-w-72 items-center gap-1 rounded-md bg-muted px-2 py-1.5 text-left"
                                    onClick={() => downloadAttachment(a.id)}
                                  >
                                    <FileText className="size-4 shrink-0 text-muted-foreground" />
                                    <span className="min-w-0 flex-1 truncate text-xs text-foreground">
                                      {a.fileName}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </div>

                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
          </ScrollArea>

          <div className="border-t p-3 relative">
            {/* Autocomplete Card Dropdown */}
            {showCardAutocomplete && filteredAutocompleteCards.length > 0 ? (
              <div className="absolute bottom-full left-3 right-3 mb-2 bg-popover text-popover-foreground border shadow-lg rounded-md overflow-hidden z-30 divide-y max-h-48 overflow-y-auto">
                <div className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase bg-muted/50">
                  Gợi ý Đề cập Card (Nhấn để chọn)
                </div>
                {filteredAutocompleteCards.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleSelectCardAutocomplete(c)}
                    className="w-full text-left px-3 py-2 hover:bg-accent hover:text-accent-foreground text-xs flex items-center justify-between transition-colors"
                  >
                    <span className="font-medium truncate">{c.title}</span>
                    <span className="text-[10px] text-muted-foreground ml-2 shrink-0">{c.listName}</span>
                  </button>
                ))}
              </div>
            ) : null}

            {editingMessageId ? (
              <div className="mb-2 text-xs text-muted-foreground">Đang chỉnh sửa…</div>
            ) : null}

            {!editingMessageId && (composerAttachments.length > 0 || pendingUploads.some((u) => u.uploading)) ? (
              <div className="mb-2 flex flex-wrap gap-2">
                {composerAttachments.map((a) => (
                  <div key={a.id} className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs">
                    <span className="max-w-48 truncate">{a.fileName}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      aria-label="Remove attachment"
                      onClick={() => setComposerAttachments((prev) => prev.filter((x) => x.id !== a.id))}
                    >
                      ×
                    </Button>
                  </div>
                ))}

                {pendingUploads.some((u) => u.uploading) ? (
                  <div className="text-xs text-muted-foreground">Đang upload…</div>
                ) : null}
              </div>
            ) : null}

            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={editingMessageId ? "Chỉnh sửa tin nhắn" : "Nhập tin nhắn (Gõ # để đề cập Card)"}
              rows={2}
              className="max-h-32 resize-none overflow-y-auto"
              onKeyDown={(e) => {
                const native = e.nativeEvent as any;
                const composing = !!native?.isComposing;

                if (composing) return;
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
            />

            <div className="mt-2 flex items-center justify-between gap-2">
              {editingMessageId ? (
                <Button variant="outline" onClick={cancelEdit}>
                  Huỷ
                </Button>
              ) : (
                <>
                  <div className="flex items-center gap-1">
                    <input
                      ref={imageInputRef}
                      type="file"
                      className="hidden"
                      multiple
                      accept="image/*"
                      onChange={(e) => {
                        const files = Array.from(e.currentTarget.files || []);
                        e.currentTarget.value = "";
                        uploadFiles(files, "image");
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      aria-label="Attach image"
                      disabled={pendingUploads.some((u) => u.uploading)}
                      onClick={() => imageInputRef.current?.click()}
                    >
                      <ImageUp className="size-4" />
                    </Button>

                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      multiple
                      accept="application/*,text/*,audio/*,video/*,.zip,.rar,.7z,.csv,.txt"
                      onChange={(e) => {
                        const files = Array.from(e.currentTarget.files || []);
                        e.currentTarget.value = "";
                        uploadFiles(files, "file");
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      aria-label="Attach file"
                      disabled={pendingUploads.some((u) => u.uploading)}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <FileUp className="size-4" />
                    </Button>
                  </div>
                </>
              )}

              <Button onClick={submit}>{editingMessageId ? "Lưu" : "Gửi"}</Button>
            </div>
          </div>
        </>
      )}

      {convertMessage ? (
        <ConvertMessageToCardDialog
          open={isConvertDialogOpen}
          onOpenChange={setIsConvertDialogOpen}
          boardId={board.id}
          messageId={convertMessage.id}
          defaultTitle={convertMessage.content.slice(0, 100) || "Card mới từ Chat"}
          defaultDescription={`Tạo từ tin nhắn chat của ${convertMessage.sender.displayName}:\n"${convertMessage.content}"`}
        />
      ) : null}
    </div>
  );
}
