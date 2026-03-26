import prisma from "../../db/prisma";

export const labelsRepo = {
  findBoardMember: async (boardId: string, userId: string) => {
    return prisma.board_members.findUnique({
      where: { boardId_userId: { boardId, userId } },
      select: { id: true, role: true },
    });
  },

  listByBoard: async (boardId: string) => {
    return prisma.labels.findMany({
      where: { boardId },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: {
        id: true,
        boardId: true,
        name: true,
        color: true,
        createdAt: true,
      },
    });
  },

  create: async (boardId: string, data: { name: string; color?: string | null }) => {
    return prisma.labels.create({
      data: {
        boardId,
        name: data.name,
        color: data.color ?? null,
      },
      select: {
        id: true,
        boardId: true,
        name: true,
        color: true,
        createdAt: true,
      },
    });
  },

  findById: async (labelId: string) => {
    return prisma.labels.findUnique({
      where: { id: labelId },
      select: {
        id: true,
        boardId: true,
        name: true,
        color: true,
        createdAt: true,
      },
    });
  },

  update: async (labelId: string, data: { name?: string; color?: string | null }) => {
    return prisma.labels.update({
      where: { id: labelId },
      data: {
        name: data.name,
        color: data.color === undefined ? undefined : data.color,
      },
      select: {
        id: true,
        boardId: true,
        name: true,
        color: true,
        createdAt: true,
      },
    });
  },

  delete: async (labelId: string) => {
    // Because card_labels has onDelete cascade on label, this will remove mappings too.
    return prisma.labels.delete({ where: { id: labelId } });
  },
};
