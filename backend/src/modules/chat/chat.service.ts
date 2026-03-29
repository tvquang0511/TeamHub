import { z } from "zod";

import { ApiError } from "../../common/errors/ApiError";
import { chatRepo } from "./chat.repo";

const EDIT_DELETE_WINDOW_MS = 20 * 60 * 1000;

export const listBoardMessagesInputSchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

export type ListBoardMessagesInput = z.infer<typeof listBoardMessagesInputSchema>;

export type BoardMessageDto = {
  id: string;
  boardId: string;
  senderId: string;
  content: string;
  createdAt: string;
  editedAt: string | null;
  deletedAt: string | null;
  sender: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
  };
};

const toDto = (row: any): BoardMessageDto => ({
  id: row.id,
  boardId: row.boardId,
  senderId: row.senderId,
  content: row.content,
  createdAt: row.createdAt.toISOString(),
  editedAt: row.editedAt ? row.editedAt.toISOString() : null,
  deletedAt: row.deletedAt ? row.deletedAt.toISOString() : null,
  sender: {
    id: row.sender.id,
    displayName: row.sender.displayName,
    avatarUrl: row.sender.avatarUrl ?? null,
  },
});

export class ChatService {
  async listBoardMessages(userId: string, boardId: string, input: ListBoardMessagesInput) {
    const board = await chatRepo.findBoard(boardId);
    if (!board || board.archivedAt) throw new ApiError(404, "BOARD_NOT_FOUND", "Board not found");

    const member = await chatRepo.isBoardMember(boardId, userId);
    if (!member) throw new ApiError(403, "CHAT_FORBIDDEN", "Chat is only available to board members");

    let cursor: { createdAt: Date; id: string } | undefined;
    if (input.cursor) {
      const cursorMsg = await chatRepo.findMessage(boardId, input.cursor);
      if (cursorMsg) cursor = { createdAt: cursorMsg.createdAt, id: cursorMsg.id };
    }

    const rows = await chatRepo.listBoardMessages({ boardId, cursor, limit: input.limit });
    const messages = rows.map(toDto);
    const nextCursor = messages.length === input.limit ? messages[messages.length - 1].id : null;

    return { messages, nextCursor };
  }

  async createMessage(userId: string, boardId: string, contentRaw: string) {
    const board = await chatRepo.findBoard(boardId);
    if (!board || board.archivedAt) throw new ApiError(404, "BOARD_NOT_FOUND", "Board not found");

    const member = await chatRepo.isBoardMember(boardId, userId);
    if (!member) throw new ApiError(403, "CHAT_FORBIDDEN", "Chat is only available to board members");

    const content = String(contentRaw ?? "").trim();
    if (!content) throw new ApiError(400, "CHAT_MESSAGE_EMPTY", "Message content is required");

    const created = await chatRepo.createMessage({ boardId, senderId: userId, content });
    return { message: toDto(created) };
  }

  async editMessage(userId: string, boardId: string, messageId: string, contentRaw: string) {
    const board = await chatRepo.findBoard(boardId);
    if (!board || board.archivedAt) throw new ApiError(404, "BOARD_NOT_FOUND", "Board not found");

    const member = await chatRepo.isBoardMember(boardId, userId);
    if (!member) throw new ApiError(403, "CHAT_FORBIDDEN", "Chat is only available to board members");

    const existing = await chatRepo.findMessage(boardId, messageId);
    if (!existing) throw new ApiError(404, "CHAT_MESSAGE_NOT_FOUND", "Message not found");
    if (existing.deletedAt) throw new ApiError(400, "CHAT_MESSAGE_DELETED", "Message was deleted");
    if (existing.senderId !== userId) throw new ApiError(403, "CHAT_FORBIDDEN", "Only author can edit");

    const now = Date.now();
    const deadline = existing.createdAt.getTime() + EDIT_DELETE_WINDOW_MS;
    if (now > deadline) {
      throw new ApiError(400, "CHAT_EDIT_WINDOW_EXPIRED", "Message can only be edited within 20 minutes");
    }

    const content = String(contentRaw ?? "").trim();
    if (!content) throw new ApiError(400, "CHAT_MESSAGE_EMPTY", "Message content is required");

    const updated = await chatRepo.updateMessage({ boardId, messageId, content, editedAt: new Date() });
    return { message: toDto(updated) };
  }

  async deleteMessage(userId: string, boardId: string, messageId: string) {
    const board = await chatRepo.findBoard(boardId);
    if (!board || board.archivedAt) throw new ApiError(404, "BOARD_NOT_FOUND", "Board not found");

    const member = await chatRepo.isBoardMember(boardId, userId);
    if (!member) throw new ApiError(403, "CHAT_FORBIDDEN", "Chat is only available to board members");

    const existing = await chatRepo.findMessage(boardId, messageId);
    if (!existing) throw new ApiError(404, "CHAT_MESSAGE_NOT_FOUND", "Message not found");
    if (existing.deletedAt) return { ok: true };
    if (existing.senderId !== userId) throw new ApiError(403, "CHAT_FORBIDDEN", "Only author can delete");

    const now = Date.now();
    const deadline = existing.createdAt.getTime() + EDIT_DELETE_WINDOW_MS;
    if (now > deadline) {
      throw new ApiError(400, "CHAT_DELETE_WINDOW_EXPIRED", "Message can only be deleted within 20 minutes");
    }

    await chatRepo.deleteMessage({ boardId, messageId, deletedAt: new Date() });
    return { ok: true };
  }
}

export const chatService = new ChatService();
