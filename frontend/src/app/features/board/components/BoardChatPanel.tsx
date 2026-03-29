import { useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { toast } from "sonner";
import { MoreHorizontal } from "lucide-react";

import { boardsApi } from "../../../api/boards.api";
import { getAccessToken } from "../../../api/http";
import { useAuth } from "../../../providers/AuthProvider";
import type { BoardDetail, BoardMessage } from "../../../types/api";
import { Button } from "../../../components/ui/button";
import { ScrollArea } from "../../../components/ui/scroll-area";
import { Textarea } from "../../../components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../../components/ui/dropdown-menu";

const EDIT_DELETE_WINDOW_MS = 20 * 60 * 1000;

function apiBaseToSocketBase(apiBase: string) {
  // API base is like http://localhost:4000/api
  // Socket server is on http://localhost:4000
  return apiBase.endsWith("/api") ? apiBase.slice(0, -"/api".length) : apiBase;
}

const SOCKET_BASE_URL = apiBaseToSocketBase(
  import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api",
);

type AckOk<T> = { ok: true } & T;
type AckErr = { ok: false; error: { code: string; message: string } };

type JoinAck = AckOk<Record<string, never>> | AckErr;

type SendAck = AckOk<{ message: BoardMessage }> | AckErr;

type UpdateAck = AckOk<{ message: BoardMessage }> | AckErr;

type DeleteAck = AckOk<{ ok: true }> | AckErr;

export function BoardChatPanel(props: { board: BoardDetail; variant?: "inline" | "sheet" }) {
  const { board } = props;
  const variant = props.variant ?? "inline";
  const { user } = useAuth();

  const canUseChat = !!board.actor?.isBoardMember;

  const [messages, setMessages] = useState<BoardMessage[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const [draft, setDraft] = useState("");
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

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
    if (!content) {
      toast.error("Nội dung tin nhắn không được trống");
      return;
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
      { boardId: board.id, content },
      (ack: SendAck) => {
        if (!ack?.ok) {
          toast.error(ack?.error?.message || "Không thể gửi tin nhắn");
          return;
        }
        setDraft("");
      },
    );
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
          <div className="text-xs text-muted-foreground">Realtime</div>
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

                return (
                  <div key={m.id} className={mine ? "text-right" : "text-left"}>
                    <div className="text-xs text-muted-foreground">
                      {mine ? "Bạn" : m.sender.displayName}
                      {" · "}
                      {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      {m.editedAt && !deleted ? " · đã chỉnh sửa" : ""}
                    </div>

                    <div className={mine ? "mt-1 flex items-center justify-end gap-1" : "mt-1"}>
                      {!deleted && mine ? (
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
                            <DropdownMenuItem disabled={!editable} onClick={() => startEdit(m)}>
                              Chỉnh sửa
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              variant="destructive"
                              disabled={!editable}
                              onClick={() => deleteMessage(m)}
                            >
                              Xoá
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : null}

                      <div
                        className={
                          "inline-block max-w-[90%] rounded-md px-3 py-2 text-sm " +
                          (mine
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-foreground")
                        }
                      >
                        {deleted ? "Tin nhắn đã bị xoá" : m.content}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
          </ScrollArea>

          <div className="border-t p-3">
            {editingMessageId ? (
              <div className="mb-2 text-xs text-muted-foreground">Đang chỉnh sửa…</div>
            ) : null}

            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={editingMessageId ? "Chỉnh sửa tin nhắn" : "Nhập tin nhắn"}
              rows={2}
              className="max-h-32 resize-none overflow-y-auto"
              onKeyDown={(e) => {
                // Enter = send, Shift+Enter = newline
                // Avoid sending while IME composing
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
                <div />
              )}

              <Button onClick={submit}>{editingMessageId ? "Lưu" : "Gửi"}</Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
