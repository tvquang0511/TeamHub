import { Prisma } from "@prisma/client";

import prisma from "../../db/prisma";

export type CreateListData = {
  boardId: string;
  name: string;
  position: Prisma.Decimal;
};

export class ListsRepo {
  async findBoard(boardId: string) {
    return (prisma as any).boards.findUnique({
      where: { id: boardId },
      select: { id: true, workspaceId: true, archivedAt: true, visibility: true },
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

  async create(data: CreateListData) {
    return prisma.lists.create({
      data: {
        boardId: data.boardId,
        name: data.name,
        position: data.position,
      },
      select: {
        id: true,
        boardId: true,
        name: true,
        position: true,
        archivedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async listByBoard(boardId: string) {
    return prisma.lists.findMany({
      where: { boardId, archivedAt: null },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        boardId: true,
        name: true,
        position: true,
        archivedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findById(listId: string) {
    return prisma.lists.findUnique({
      where: { id: listId },
      select: {
        id: true,
        boardId: true,
        name: true,
        position: true,
        archivedAt: true,
        createdAt: true,
        updatedAt: true,
        board: { select: { workspaceId: true } },
      },
    });
  }

  async update(
    listId: string,
    data: Partial<Pick<CreateListData, "name">> & {
      position?: Prisma.Decimal | null;
      archivedAt?: Date | null;
    },
  ) {
    return prisma.lists.update({
      where: { id: listId },
      data: {
        name: data.name,
        position: data.position ?? undefined,
        archivedAt: data.archivedAt ?? undefined,
      },
      select: {
        id: true,
        boardId: true,
        name: true,
        position: true,
        archivedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findListPosition(listId: string) {
    return prisma.lists.findUnique({
      where: { id: listId },
      select: { id: true, boardId: true, position: true, archivedAt: true },
    });
  }

  async updatePosition(listId: string, position: Prisma.Decimal) {
    return prisma.lists.update({
      where: { id: listId },
      data: { position },
      select: {
        id: true,
        boardId: true,
        name: true,
        position: true,
        archivedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async archiveCardsByList(listId: string) {
    return prisma.cards.updateMany({
      where: { listId, archivedAt: null },
      data: { archivedAt: new Date() },
    });
  }
}

export const listsRepo = new ListsRepo();
