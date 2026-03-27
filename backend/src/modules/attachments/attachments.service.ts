import { z } from "zod";

import { ApiError } from "../../common/errors/ApiError";
import { attachmentsRepo } from "./attachments.repo";
import { cardsRepo } from "../cards/cards.repo";
import { presignPutObject, requireEnv } from "../../common/minio/minio.presign.put";
import { presignGetObject } from "../../common/minio/minio.presign.get";

export const presignUploadInputSchema = z.object({
  fileName: z.string().min(1).max(500),
  mimeType: z.string().min(1).max(200),
  size: z.number().int().positive().max(50 * 1024 * 1024), // 50MB cap (adjustable)
});

export const commitFileAttachmentInputSchema = z.object({
  bucket: z.string().min(1).max(200),
  objectKey: z.string().min(1).max(2000),
  url: z.string().url().optional(),
  fileName: z.string().min(1).max(500),
  mimeType: z.string().min(1).max(200),
  size: z.number().int().positive().max(50 * 1024 * 1024),
});

export const createLinkAttachmentInputSchema = z.object({
  linkUrl: z.string().url(),
  linkTitle: z.string().max(500).optional(),
});

export const createCardAttachmentInputSchema = z.object({
  referencedCardId: z.string().uuid(),
  linkTitle: z.string().max(500).optional(),
});

export class AttachmentsService {
  private async assertCanWriteCard(userId: string, cardId: string) {
    const card = await cardsRepo.findById(cardId);
    if (!card) throw new ApiError(404, "CARD_NOT_FOUND", "Card not found");

    const workspaceId = card.list.board.workspaceId;
    const membership = await cardsRepo.isWorkspaceMember(workspaceId, userId);
    if (!membership) throw new ApiError(403, "WORKSPACE_FORBIDDEN", "You are not a member of this workspace");

    const boardMember = await cardsRepo.isBoardMember(card.list.board.id, userId);
    if (!boardMember) throw new ApiError(403, "BOARD_FORBIDDEN", "Board is read-only for non-members");

    return { card };
  }

  private async assertCanReadCard(userId: string, cardId: string) {
    const card = await cardsRepo.findById(cardId);
    if (!card) throw new ApiError(404, "CARD_NOT_FOUND", "Card not found");

    const workspaceId = card.list.board.workspaceId;
    const membership = await cardsRepo.isWorkspaceMember(workspaceId, userId);
    if (!membership) throw new ApiError(403, "WORKSPACE_FORBIDDEN", "You are not a member of this workspace");

    if (card.list.board.visibility !== "WORKSPACE") {
      const boardMember = await cardsRepo.isBoardMember(card.list.board.id, userId);
      if (!boardMember) {
        // Option B: workspace OWNER/ADMIN can read PRIVATE boards in read-only mode.
        if (membership.role !== "OWNER" && membership.role !== "ADMIN") {
          throw new ApiError(404, "BOARD_NOT_FOUND", "Board not found");
        }
      }
    }

    return { card };
  }

  async list(userId: string, cardId: string) {
    await this.assertCanReadCard(userId, cardId);
    const attachments = await attachmentsRepo.listByCard(cardId);
    return { attachments };
  }

  async presignUpload(userId: string, cardId: string, input: z.infer<typeof presignUploadInputSchema>) {
    await this.assertCanWriteCard(userId, cardId);

    const endpoint = requireEnv("MINIO_ENDPOINT");
    const accessKeyId = requireEnv("MINIO_ACCESS_KEY");
    const secretAccessKey = requireEnv("MINIO_SECRET_KEY");
    const bucket = process.env.MINIO_BUCKET || "teamhub";
    const region = process.env.MINIO_REGION || "us-east-1";

    const safeFileName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const objectKey = `cards/${cardId}/${Date.now()}_${safeFileName}`;

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

  async commitFile(userId: string, cardId: string, input: z.infer<typeof commitFileAttachmentInputSchema>) {
    await this.assertCanWriteCard(userId, cardId);

    const attachment = await attachmentsRepo.create({
      cardId,
      uploaderId: userId,
      type: "FILE",
      bucket: input.bucket,
      objectKey: input.objectKey,
      url: input.url ?? null,
      fileName: input.fileName,
      mimeType: input.mimeType,
      size: input.size,
    });

    return { attachment };
  }

  async createLink(userId: string, cardId: string, input: z.infer<typeof createLinkAttachmentInputSchema>) {
    await this.assertCanWriteCard(userId, cardId);

    const attachment = await attachmentsRepo.create({
      cardId,
      uploaderId: userId,
      type: "LINK",
      linkUrl: input.linkUrl,
      linkTitle: input.linkTitle ?? null,
    });

    return { attachment };
  }

  async createCardRef(
    userId: string,
    cardId: string,
    input: z.infer<typeof createCardAttachmentInputSchema>,
  ) {
    const { card } = await this.assertCanWriteCard(userId, cardId);

    const ref = await cardsRepo.findById(input.referencedCardId);
    if (!ref) throw new ApiError(404, "CARD_NOT_FOUND", "Referenced card not found");

    // Same board constraint
    if (ref.list.board.id !== card.list.board.id) {
      throw new ApiError(400, "ATTACHMENT_INVALID", "Referenced card must be in the same board");
    }

    // Store a relative link the frontend can resolve (keeps env-agnostic)
    const linkUrl = `/boards/${card.list.board.id}?cardId=${ref.id}`;
  // User requested: don't prefix with "Card:"; default to referenced card title.
  const linkTitle = input.linkTitle || ref.title;

    const attachment = await attachmentsRepo.create({
      cardId,
      uploaderId: userId,
      type: "CARD",
      linkUrl,
      linkTitle,
      referencedCardId: ref.id,
    } as any);

    return { attachment };
  }

  async delete(userId: string, attachmentId: string) {
    const existing = await attachmentsRepo.findById(attachmentId);
    if (!existing) throw new ApiError(404, "ATTACHMENT_NOT_FOUND", "Attachment not found");

    // Permission: must be able to write card (board member). (Could also allow board admin)
    await this.assertCanWriteCard(userId, existing.cardId);

    // Optional policy: allow only uploader to delete. For now: board members can delete.
    await attachmentsRepo.delete(attachmentId);
    return { ok: true };
  }

  async presignDownload(userId: string, attachmentId: string) {
    const existing = await attachmentsRepo.findById(attachmentId);
    if (!existing) throw new ApiError(404, "ATTACHMENT_NOT_FOUND", "Attachment not found");

    // Must be allowed to read the card.
    await this.assertCanReadCard(userId, existing.cardId);

    if (existing.type !== "FILE") {
      throw new ApiError(400, "ATTACHMENT_INVALID", "Only FILE attachments can be downloaded");
    }
    if (!existing.bucket || !existing.objectKey) {
      throw new ApiError(400, "ATTACHMENT_INVALID", "Attachment storage info missing");
    }

    const endpoint = requireEnv("MINIO_ENDPOINT");
    const accessKeyId = requireEnv("MINIO_ACCESS_KEY");
    const secretAccessKey = requireEnv("MINIO_SECRET_KEY");
    const region = process.env.MINIO_REGION || "us-east-1";

    const presign = presignGetObject({
      endpoint,
      accessKeyId,
      secretAccessKey,
      region,
      bucket: existing.bucket,
      objectKey: existing.objectKey,
      expiresInSeconds: 300,
    });

    return { presign };
  }
}

export const attachmentsService = new AttachmentsService();
