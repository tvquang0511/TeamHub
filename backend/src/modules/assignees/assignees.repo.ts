import prisma from "../../db/prisma";

export class AssigneesRepo {
  async listByCard(cardId: string) {
    return prisma.card_assignees.findMany({
      where: { cardId },
      orderBy: [{ createdAt: "asc" }],
      select: {
        id: true,
        createdAt: true,
        user: {
          select: { id: true, email: true, displayName: true },
        },
      },
    });
  }

  async isAssigned(cardId: string, userId: string) {
    return prisma.card_assignees.findUnique({
      where: { cardId_userId: { cardId, userId } },
      select: { id: true },
    });
  }

  async assign(cardId: string, userId: string) {
    return prisma.card_assignees.create({
      data: { cardId, userId },
      select: {
        id: true,
        createdAt: true,
        user: { select: { id: true, email: true, displayName: true } },
      },
    });
  }

  async unassign(cardId: string, userId: string) {
    return prisma.card_assignees.delete({
      where: { cardId_userId: { cardId, userId } },
      select: { id: true },
    });
  }
}

export const assigneesRepo = new AssigneesRepo();
