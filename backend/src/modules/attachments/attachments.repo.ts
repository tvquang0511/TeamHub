import prisma from "../../db/prisma";

export type CreateAttachmentData = {
  cardId: string;
  uploaderId: string;
  type: "FILE" | "LINK";

  // FILE
  bucket?: string | null;
  objectKey?: string | null;
  url?: string | null;
  fileName?: string | null;
  mimeType?: string | null;
  size?: number | null;

  // LINK
  linkUrl?: string | null;
  linkTitle?: string | null;
};

export const attachmentsRepo = {
  listByCard: async (cardId: string) => {
    return (prisma as any).card_attachments.findMany({
      where: { cardId },
      orderBy: { createdAt: "desc" },
      include: {
        uploader: { select: { id: true, email: true, displayName: true } },
      },
    });
  },

  findById: async (id: string) => {
    return (prisma as any).card_attachments.findUnique({
      where: { id },
      include: {
        card: {
          select: {
            id: true,
            list: { select: { id: true, board: { select: { id: true, workspaceId: true, visibility: true } } } },
          },
        },
        uploader: { select: { id: true, email: true, displayName: true } },
      },
    });
  },

  create: async (data: CreateAttachmentData) => {
    return (prisma as any).card_attachments.create({
      data: {
        cardId: data.cardId,
        uploaderId: data.uploaderId,
        type: data.type as any,

        bucket: data.bucket ?? null,
        objectKey: data.objectKey ?? null,
        url: data.url ?? null,
        fileName: data.fileName ?? null,
        mimeType: data.mimeType ?? null,
        size: data.size ?? null,

        linkUrl: data.linkUrl ?? null,
        linkTitle: data.linkTitle ?? null,
      },
      include: {
        uploader: { select: { id: true, email: true, displayName: true } },
      },
    });
  },

  delete: async (id: string) => {
    return (prisma as any).card_attachments.delete({ where: { id } });
  },
};
