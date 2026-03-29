import { z } from "zod";

import { ApiError } from "../../common/errors/ApiError";
import { presignPutObject } from "../../common/minio/minio.presign.put";
import { presignGetObject } from "../../common/minio/minio.presign.get";
import env from "../../config/env";
import { chatRepo } from "./chat.repo";

export const chatPresignUploadInputSchema = z.object({
  fileName: z.string().min(1).max(500),
  mimeType: z.string().min(1).max(200),
  size: z.number().int().positive().max(50 * 1024 * 1024), // 50MB cap
});

export const chatCommitFileAttachmentInputSchema = z.object({
  bucket: z.string().min(1).max(200),
  objectKey: z.string().min(1).max(2000),
  url: z.string().url().optional(),
  fileName: z.string().min(1).max(500),
  mimeType: z.string().min(1).max(200),
  size: z.number().int().positive().max(50 * 1024 * 1024),
});

export type ChatPresignUploadInput = z.infer<typeof chatPresignUploadInputSchema>;
export type ChatCommitFileAttachmentInput = z.infer<typeof chatCommitFileAttachmentInputSchema>;

export class ChatAttachmentsService {
  private async assertBoardMember(userId: string, boardId: string) {
    const board = await chatRepo.findBoard(boardId);
    if (!board || board.archivedAt) throw new ApiError(404, "BOARD_NOT_FOUND", "Board not found");

    const member = await chatRepo.isBoardMember(boardId, userId);
    if (!member) throw new ApiError(403, "CHAT_FORBIDDEN", "Chat is only available to board members");

    return { board };
  }

  async presignUpload(userId: string, boardId: string, input: ChatPresignUploadInput) {
    await this.assertBoardMember(userId, boardId);

    const endpoint = env.MINIO_ENDPOINT;
    const accessKeyId = env.MINIO_ACCESS_KEY;
    const secretAccessKey = env.MINIO_SECRET_KEY;
    const bucket = env.MINIO_BUCKET; // private bucket
    const region = env.MINIO_REGION;

    const safeFileName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const objectKey = `boards/${boardId}/messages/${Date.now()}_${safeFileName}`;

    const presign = presignPutObject({
      endpoint,
      accessKeyId,
      secretAccessKey,
      bucket,
      objectKey,
      region,
      contentType: input.mimeType,
      expiresInSeconds: 300,
    });

    return { presign };
  }

  async commitFile(userId: string, boardId: string, input: ChatCommitFileAttachmentInput) {
    await this.assertBoardMember(userId, boardId);

    // Safety: only allow committing into configured private bucket.
    if (input.bucket !== env.MINIO_BUCKET) {
      throw new ApiError(400, "ATTACHMENT_INVALID", "Invalid bucket");
    }

    // Basic prefix guard (avoid committing arbitrary keys outside board scope)
    const expectedPrefix = `boards/${boardId}/messages/`;
    if (!input.objectKey.startsWith(expectedPrefix)) {
      throw new ApiError(400, "ATTACHMENT_INVALID", "Invalid object key");
    }

    const attachment = await chatRepo.createMessageAttachment({
      boardId,
      uploaderId: userId,
      bucket: input.bucket,
      objectKey: input.objectKey,
      url: input.url ?? null,
      fileName: input.fileName,
      mimeType: input.mimeType,
      size: input.size,
    });

    return { attachment };
  }

  async presignDownload(
    userId: string,
    boardId: string,
    attachmentId: string,
    opts?: { disposition?: "inline" | "attachment" },
  ) {
    await this.assertBoardMember(userId, boardId);

    const existing = await chatRepo.findMessageAttachmentById(attachmentId);
    if (!existing || existing.boardId !== boardId) {
      throw new ApiError(404, "ATTACHMENT_NOT_FOUND", "Attachment not found");
    }

    const endpoint = env.MINIO_ENDPOINT;
    const accessKeyId = env.MINIO_ACCESS_KEY;
    const secretAccessKey = env.MINIO_SECRET_KEY;
    const region = env.MINIO_REGION;

    const safeFileName = String(existing.fileName || "file")
      .replace(/[\\/]/g, "_")
      .replace(/\r|\n/g, " ")
      .replace(/"/g, "'");
    const disposition = opts?.disposition === "inline" ? "inline" : "attachment";
    const contentDisposition = `${disposition}; filename="${safeFileName}"`;

    const presign = presignGetObject({
      endpoint,
      accessKeyId,
      secretAccessKey,
      region,
      bucket: existing.bucket,
      objectKey: existing.objectKey,
      expiresInSeconds: 300,
      responseContentDisposition: contentDisposition,
      responseContentType: existing.mimeType || "application/octet-stream",
    });

    return { presign };
  }
}

export const chatAttachmentsService = new ChatAttachmentsService();
