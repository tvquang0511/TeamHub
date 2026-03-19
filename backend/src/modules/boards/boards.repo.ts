import { Prisma } from "@prisma/client";

import prisma from "../../db/prisma";

export type CreateBoardData = {
  workspaceId: string;
  name: string;
  description?: string | null;
  position?: Prisma.Decimal | null;
};

export class BoardsRepo {
  async isWorkspaceMember(workspaceId: string, userId: string) {
    const member = await prisma.workspace_members.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
      select: { id: true, role: true },
    });

    return member;
  }

  async create(data: CreateBoardData) {
    return prisma.boards.create({
      data: {
        workspaceId: data.workspaceId,
        name: data.name,
        description: data.description ?? null,
        position: data.position ?? null,
      },
      select: {
        id: true,
        workspaceId: true,
        name: true,
        description: true,
        position: true,
        archivedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async listByWorkspace(workspaceId: string) {
    return prisma.boards.findMany({
      where: { workspaceId, archivedAt: null },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        workspaceId: true,
        name: true,
        description: true,
        position: true,
        archivedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findById(boardId: string) {
    return prisma.boards.findUnique({
      where: { id: boardId },
      select: {
        id: true,
        workspaceId: true,
        name: true,
        description: true,
        position: true,
        archivedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async update(
    boardId: string,
    data: Partial<Pick<CreateBoardData, "name" | "description" | "position">> & {
      archivedAt?: Date | null;
    },
  ) {
    return prisma.boards.update({
      where: { id: boardId },
      data: {
        name: data.name,
        description: data.description ?? undefined,
        position: data.position ?? undefined,
        archivedAt: data.archivedAt ?? undefined,
      },
      select: {
        id: true,
        workspaceId: true,
        name: true,
        description: true,
        position: true,
        archivedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }
}

export const boardsRepo = new BoardsRepo();
