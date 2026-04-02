import { z } from "zod";

import { ApiError } from "../../common/errors/ApiError";
import { chatRepo } from "./chat.repo";
import { enqueueDeleteObject } from "../../integrations/queue/blobs.queue";

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
  attachments: {
    id: string;
    bucket: string;
    objectKey: string;
    url: string | null;
    fileName: string;
    mimeType: string;
    size: number;
    createdAt: string;
  }[];
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
  attachments: Array.isArray(row.attachments)
    ? row.attachments.map((a: any) => ({
        id: a.id,
        bucket: a.bucket,
        objectKey: a.objectKey,
        url: a.url ?? null,
        fileName: a.fileName,
        mimeType: a.mimeType,
        size: a.size,
        createdAt: a.createdAt.toISOString(),
      }))
    : [],
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

  async createMessage(
    userId: string,
    boardId: string,
    contentRaw: string,
    attachmentIdsRaw?: string[] | null,
  ) {
    const board = await chatRepo.findBoard(boardId);
    if (!board || board.archivedAt) throw new ApiError(404, "BOARD_NOT_FOUND", "Board not found");

    const member = await chatRepo.isBoardMember(boardId, userId);
    if (!member) throw new ApiError(403, "CHAT_FORBIDDEN", "Chat is only available to board members");

    const content = String(contentRaw ?? "").trim();
    const attachmentIds = Array.isArray(attachmentIdsRaw)
      ? attachmentIdsRaw.map(String).filter(Boolean)
      : [];

    if (!content && attachmentIds.length === 0) {
      throw new ApiError(400, "CHAT_MESSAGE_EMPTY", "Message content is required");
    }

    let created: any;
    try {
      created = await chatRepo.createMessageWithAttachments({
        boardId,
        senderId: userId,
        content,
        attachmentIds,
      });
    } catch (e: any) {
      if (e?.code === "ATTACHMENT_INVALID" || e?.message === "ATTACHMENT_INVALID") {
        throw new ApiError(400, "ATTACHMENT_INVALID", "One or more attachments are invalid or already linked");
      }
      throw e;
    }

    if (!created) throw new ApiError(500, "CHAT_ERROR", "Failed to create message");

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

    // Attachments are only meaningful for active messages.
    // Remove rows and delete underlying objects to avoid storage leaks.
    const attachments = await chatRepo.listMessageAttachments(messageId);
    if (attachments.length) {
      await chatRepo.deleteMessageAttachments(messageId);
      await Promise.all(
        attachments.map((a) => enqueueDeleteObject({ bucket: a.bucket, objectKey: a.objectKey })),
      );
    }
    return { ok: true };
  }
}

export const chatService = new ChatService();
