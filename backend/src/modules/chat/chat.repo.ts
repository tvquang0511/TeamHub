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
        sender: {
          select: { id: true, displayName: true, avatarUrl: true },
        },
      },
    }) as Promise<ChatMessageRow>;
  }
}

export const chatRepo = new ChatRepo();
