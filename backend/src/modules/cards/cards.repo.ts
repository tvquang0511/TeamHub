import { Prisma } from "@prisma/client";

import prisma from "../../db/prisma";

export type CreateCardData = {
  listId: string;
  title: string;
  description?: string | null;
  dueAt?: Date | null;
  position: Prisma.Decimal;
};

export class CardsRepo {
  async findList(listId: string) {
    return (prisma as any).lists.findUnique({
      where: { id: listId },
      select: {
        id: true,
        board: {
          select: { id: true, workspaceId: true, archivedAt: true, visibility: true },
        },
        archivedAt: true,
      },
    });
  }

  async isWorkspaceMember(workspaceId: string, userId: string) {
    return prisma.workspace_members.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
      select: { id: true, role: true },
    });
  }

  async isBoardMember(boardId: string, userId: string) {
    return (prisma as any).board_members.findUnique({
      where: { boardId_userId: { boardId, userId } },
      select: { id: true, role: true },
    });
  }

  async create(data: CreateCardData) {
    return prisma.cards.create({
      data: {
        listId: data.listId,
        title: data.title,
        description: data.description ?? null,
        dueAt: data.dueAt ?? null,
        position: data.position,
      },
      select: {
        id: true,
        listId: true,
        title: true,
        description: true,
        dueAt: true,
        position: true,
        archivedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async listByList(listId: string) {
    return prisma.cards.findMany({
      where: { listId, archivedAt: null },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        listId: true,
        title: true,
        description: true,
        dueAt: true,
        position: true,
        archivedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findById(cardId: string) {
    return (prisma as any).cards.findUnique({
      where: { id: cardId },
      select: {
        id: true,
        listId: true,
        title: true,
        description: true,
        dueAt: true,
        position: true,
        archivedAt: true,
        createdAt: true,
        updatedAt: true,
        list: { select: { board: { select: { id: true, workspaceId: true, visibility: true } } } },
      },
    });
  }

  async update(
    cardId: string,
    data: {
      title?: string;
      description?: string | null;
      dueAt?: Date | null;
      position?: Prisma.Decimal | null;
      archivedAt?: Date | null;
      listId?: string;
    },
  ) {
    return prisma.cards.update({
      where: { id: cardId },
      data: {
        title: data.title,
        description: data.description ?? undefined,
        dueAt: data.dueAt ?? undefined,
        position: data.position ?? undefined,
        archivedAt: data.archivedAt ?? undefined,
        listId: data.listId,
      },
      select: {
        id: true,
        listId: true,
        title: true,
        description: true,
        dueAt: true,
        position: true,
        archivedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findCardPosition(cardId: string) {
    return prisma.cards.findUnique({
      where: { id: cardId },
      select: { id: true, listId: true, position: true, archivedAt: true },
    });
  }

  async move(cardId: string, data: { listId?: string; position: Prisma.Decimal }) {
    return prisma.cards.update({
      where: { id: cardId },
      data: { listId: data.listId, position: data.position },
      select: {
        id: true,
        listId: true,
        title: true,
        description: true,
        dueAt: true,
        position: true,
        archivedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findCardWorkspaceAndBoard(cardId: string) {
    return (prisma as any).cards.findUnique({
      where: { id: cardId },
      select: {
        id: true,
        archivedAt: true,
        list: {
          select: {
            archivedAt: true,
            board: {
              select: { id: true, workspaceId: true, archivedAt: true, visibility: true },
            },
          },
        },
      },
    });
  }

  async findLabel(labelId: string) {
    return prisma.labels.findUnique({
      where: { id: labelId },
      select: { id: true, workspaceId: true, name: true, color: true },
    });
  }

  async listLabelsByCard(cardId: string) {
    return prisma.card_labels.findMany({
      where: { cardId },
      orderBy: [{ createdAt: "asc" }],
      select: {
        id: true,
        createdAt: true,
        label: { select: { id: true, workspaceId: true, name: true, color: true, createdAt: true } },
      },
    });
  }

  async attachLabel(cardId: string, labelId: string) {
    return prisma.card_labels.create({
      data: { cardId, labelId },
      select: {
        id: true,
        createdAt: true,
        label: { select: { id: true, workspaceId: true, name: true, color: true, createdAt: true } },
      },
    });
  }

  async detachLabel(cardId: string, labelId: string) {
    return prisma.card_labels.delete({
      where: { cardId_labelId: { cardId, labelId } },
      select: { id: true },
    });
  }
}

export const cardsRepo = new CardsRepo();
