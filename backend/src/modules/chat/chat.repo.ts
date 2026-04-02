import prisma from "../../db/prisma";

export type ChatMessageRow = {
  id: string;
  boardId: string;
  senderId: string;
  content: string;
  createdAt: Date;
  editedAt: Date | null;
  deletedAt: Date | null;
  sender: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
  };
  attachments?: ChatMessageAttachmentRow[];
};

export type ChatMessageAttachmentRow = {
  id: string;
  boardId: string;
  messageId: string | null;
  uploaderId: string;
  bucket: string;
  objectKey: string;
  url: string | null;
  fileName: string;
  mimeType: string;
  size: number;
  createdAt: Date;
  linkedAt: Date | null;
};

export class ChatRepo {
  async findBoard(boardId: string) {
    return (prisma as any).boards.findUnique({
      where: { id: boardId },
      select: { id: true, archivedAt: true },
    });
  }

  async isBoardMember(boardId: string, userId: string) {
    return (prisma as any).board_members.findUnique({
      where: { boardId_userId: { boardId, userId } },
      select: { id: true, role: true },
    });
  }

  async findMessage(boardId: string, messageId: string) {
    return (prisma as any).board_messages.findFirst({
      where: { id: messageId, boardId },
      select: {
        id: true,
        boardId: true,
        senderId: true,
        content: true,
        createdAt: true,
        editedAt: true,
        deletedAt: true,
      },
    }) as Promise<
      | {
          id: string;
          boardId: string;
          senderId: string;
          content: string;
          createdAt: Date;
          editedAt: Date | null;
          deletedAt: Date | null;
        }
      | null
    >;
  }

  async listBoardMessages(input: { boardId: string; cursor?: { createdAt: Date; id: string }; limit: number }) {
    const where: any = { boardId: input.boardId };

    if (input.cursor) {
      where.OR = [
        { createdAt: { lt: input.cursor.createdAt } },
        { createdAt: input.cursor.createdAt, id: { lt: input.cursor.id } },
      ];
    }

    return (prisma as any).board_messages.findMany({
      where,
      take: input.limit,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: {
        id: true,
        boardId: true,
        senderId: true,
        content: true,
        createdAt: true,
        editedAt: true,
        deletedAt: true,
        attachments: {
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
          select: {
            id: true,
            boardId: true,
            messageId: true,
            uploaderId: true,
            bucket: true,
            objectKey: true,
            url: true,
            fileName: true,
            mimeType: true,
            size: true,
            createdAt: true,
            linkedAt: true,
          },
        },
        sender: {
          select: { id: true, displayName: true, avatarUrl: true },
        },
      },
    }) as Promise<ChatMessageRow[]>;
  }

  async createMessage(input: { boardId: string; senderId: string; content: string }) {
    return (prisma as any).board_messages.create({
      data: {
        boardId: input.boardId,
        senderId: input.senderId,
        content: input.content,
      },
      select: {
        id: true,
        boardId: true,
        senderId: true,
        content: true,
        createdAt: true,
        editedAt: true,
        deletedAt: true,
        attachments: {
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
          select: {
            id: true,
            boardId: true,
            messageId: true,
            uploaderId: true,
            bucket: true,
            objectKey: true,
            url: true,
            fileName: true,
            mimeType: true,
            size: true,
            createdAt: true,
            linkedAt: true,
          },
        },
        sender: {
          select: { id: true, displayName: true, avatarUrl: true },
        },
      },
    }) as Promise<ChatMessageRow>;
  }

  async updateMessage(input: { boardId: string; messageId: string; content: string; editedAt: Date }) {
    return (prisma as any).board_messages.update({
      where: { id: input.messageId },
      data: {
        content: input.content,
        editedAt: input.editedAt,
      },
      select: {
        id: true,
        boardId: true,
        senderId: true,
        content: true,
        createdAt: true,
        editedAt: true,
        deletedAt: true,
        attachments: {
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
          select: {
            id: true,
            boardId: true,
            messageId: true,
            uploaderId: true,
            bucket: true,
            objectKey: true,
            url: true,
            fileName: true,
            mimeType: true,
            size: true,
            createdAt: true,
            linkedAt: true,
          },
        },
        sender: {
          select: { id: true, displayName: true, avatarUrl: true },
        },
      },
    }) as Promise<ChatMessageRow>;
  }

  async deleteMessage(input: { boardId: string; messageId: string; deletedAt: Date }) {
    return (prisma as any).board_messages.update({
      where: { id: input.messageId },
      data: {
        content: "",
        deletedAt: input.deletedAt,
      },
      select: {
        id: true,
        boardId: true,
        senderId: true,
        content: true,
        createdAt: true,
        editedAt: true,
        deletedAt: true,
        attachments: {
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
          select: {
            id: true,
            boardId: true,
            messageId: true,
            uploaderId: true,
            bucket: true,
            objectKey: true,
            url: true,
            fileName: true,
            mimeType: true,
            size: true,
            createdAt: true,
            linkedAt: true,
          },
        },
        sender: {
          select: { id: true, displayName: true, avatarUrl: true },
        },
      },
    }) as Promise<ChatMessageRow>;
  }

  async createMessageAttachment(input: {
    boardId: string;
    uploaderId: string;
    bucket: string;
    objectKey: string;
    url: string | null;
    fileName: string;
    mimeType: string;
    size: number;
  }) {
    return (prisma as any).board_message_attachments.create({
      data: {
        boardId: input.boardId,
        uploaderId: input.uploaderId,
        bucket: input.bucket,
        objectKey: input.objectKey,
        url: input.url,
        fileName: input.fileName,
        mimeType: input.mimeType,
        size: input.size,
      },
      select: {
        id: true,
        boardId: true,
        messageId: true,
        uploaderId: true,
        bucket: true,
        objectKey: true,
        url: true,
        fileName: true,
        mimeType: true,
        size: true,
        createdAt: true,
        linkedAt: true,
      },
    }) as Promise<ChatMessageAttachmentRow>;
  }

  async findMessageAttachmentById(attachmentId: string) {
    return (prisma as any).board_message_attachments.findUnique({
      where: { id: attachmentId },
      select: {
        id: true,
        boardId: true,
        messageId: true,
        uploaderId: true,
        bucket: true,
        objectKey: true,
        url: true,
        fileName: true,
        mimeType: true,
        size: true,
        createdAt: true,
        linkedAt: true,
      },
    }) as Promise<ChatMessageAttachmentRow | null>;
  }

  async findUnlinkedMessageAttachments(input: { boardId: string; uploaderId: string; ids: string[] }) {
    if (!input.ids.length) return [] as ChatMessageAttachmentRow[];

    return (prisma as any).board_message_attachments.findMany({
      where: {
        id: { in: input.ids },
        boardId: input.boardId,
        uploaderId: input.uploaderId,
        messageId: null,
      },
      select: {
        id: true,
        boardId: true,
        messageId: true,
        uploaderId: true,
        bucket: true,
        objectKey: true,
        url: true,
        fileName: true,
        mimeType: true,
        size: true,
        createdAt: true,
        linkedAt: true,
      },
    }) as Promise<ChatMessageAttachmentRow[]>;
  }

  async linkAttachmentsToMessage(input: { messageId: string; attachmentIds: string[]; linkedAt: Date }) {
    if (!input.attachmentIds.length) return { count: 0 };
    return (prisma as any).board_message_attachments.updateMany({
      where: { id: { in: input.attachmentIds }, messageId: null },
      data: { messageId: input.messageId, linkedAt: input.linkedAt },
    }) as Promise<{ count: number }>;
  }

  async listMessageAttachments(messageId: string) {
    return (prisma as any).board_message_attachments.findMany({
      where: { messageId },
      select: {
        id: true,
        boardId: true,
        messageId: true,
        uploaderId: true,
        bucket: true,
        objectKey: true,
        url: true,
        fileName: true,
        mimeType: true,
        size: true,
        createdAt: true,
        linkedAt: true,
      },
    }) as Promise<ChatMessageAttachmentRow[]>;
  }

  async deleteMessageAttachments(messageId: string) {
    return (prisma as any).board_message_attachments.deleteMany({
      where: { messageId },
    }) as Promise<{ count: number }>;
  }

  async createMessageWithAttachments(input: {
    boardId: string;
    senderId: string;
    content: string;
    attachmentIds: string[];
  }) {
    const { boardId, senderId, content, attachmentIds } = input;

    return prisma.$transaction(async (tx: any) => {
      const message = await tx.board_messages.create({
        data: { boardId, senderId, content },
        select: { id: true },
      });

      if (attachmentIds.length) {
        const attachments = await tx.board_message_attachments.findMany({
          where: {
            id: { in: attachmentIds },
            boardId,
            uploaderId: senderId,
            messageId: null,
          },
          select: { id: true },
        });

        if (attachments.length !== attachmentIds.length) {
          const err = new Error("ATTACHMENT_INVALID");
          (err as any).code = "ATTACHMENT_INVALID";
          throw err;
        }

        await tx.board_message_attachments.updateMany({
          where: { id: { in: attachmentIds }, messageId: null },
          data: { messageId: message.id, linkedAt: new Date() },
        });
      }

      return tx.board_messages.findUnique({
        where: { id: message.id },
        select: {
          id: true,
          boardId: true,
          senderId: true,
          content: true,
          createdAt: true,
          editedAt: true,
          deletedAt: true,
          attachments: {
            orderBy: [{ createdAt: "asc" }, { id: "asc" }],
            select: {
              id: true,
              bucket: true,
              objectKey: true,
              url: true,
              fileName: true,
              mimeType: true,
              size: true,
              createdAt: true,
            },
          },
          sender: { select: { id: true, displayName: true, avatarUrl: true } },
        },
      });
    });
  }
}

export const chatRepo = new ChatRepo();
