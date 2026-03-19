import { Prisma } from "@prisma/client";

import prisma from "../../db/prisma";

export type CreateBoardData = {
  workspaceId: string;
  name: string;
  description?: string | null;
  visibility?: "PRIVATE" | "WORKSPACE";
  position?: Prisma.Decimal | null;
};

export class BoardsRepo {
  async isWorkspaceMember(workspaceId: string, userId: string) {
    return prisma.workspace_members.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
      select: { id: true, role: true },
    });
  }

  async isBoardMember(boardId: string, userId: string) {
    // NOTE: if Prisma Client typings haven't been regenerated yet,
    // access via `any` to unblock compilation; runtime works once `prisma generate` is run.
    return (prisma as any).board_members.findUnique({
      where: { boardId_userId: { boardId, userId } },
      select: { id: true, role: true },
    });
  }

  async addBoardMember(data: { boardId: string; userId: string; role: "OWNER" | "ADMIN" | "MEMBER" }) {
    return (prisma as any).board_members.create({
      data: {
        boardId: data.boardId,
        userId: data.userId,
        role: data.role as any,
      },
      select: { id: true, boardId: true, userId: true, role: true, createdAt: true },
    });
  }

  async listBoardMembers(boardId: string) {
    return (prisma as any).board_members.findMany({
      where: { boardId },
      include: {
        user: { select: { id: true, email: true, displayName: true } },
      },
      orderBy: { createdAt: "asc" },
    });
  }

  async findUserByEmail(email: string) {
    return prisma.users.findUnique({
      where: { email },
      select: { id: true, email: true, displayName: true },
    });
  }

  async removeBoardMember(boardId: string, userId: string) {
    return (prisma as any).board_members.delete({
      where: { boardId_userId: { boardId, userId } },
    });
  }

  async create(data: CreateBoardData) {
    return (prisma as any).boards.create({
      data: {
        workspaceId: data.workspaceId,
        name: data.name,
        description: data.description ?? null,
        visibility: (data.visibility ?? "PRIVATE") as any,
        position: data.position ?? null,
      },
      select: {
        id: true,
        workspaceId: true,
        name: true,
        description: true,
        // visibility field exists in schema; may require `prisma generate` for typings.
        visibility: true as any,
        position: true,
        archivedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async listByWorkspaceVisibleToUser(workspaceId: string, userId: string) {
    return (prisma as any).boards.findMany({
      where: {
        workspaceId,
        archivedAt: null,
        OR: [
          { visibility: "WORKSPACE" as any },
          { members: { some: { userId } } } as any,
        ],
      },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        workspaceId: true,
        name: true,
        description: true,
        visibility: true as any,
        position: true,
        archivedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findById(boardId: string) {
    return (prisma as any).boards.findUnique({
      where: { id: boardId },
      select: {
        id: true,
        workspaceId: true,
        name: true,
        description: true,
        visibility: true as any,
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
    return (prisma as any).boards.update({
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

  async listListsByBoard(boardId: string) {
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

  async listCardsByBoard(boardId: string) {
    return prisma.cards.findMany({
      where: { archivedAt: null, list: { boardId } },
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

  async listLabelsByWorkspace(workspaceId: string) {
    // Labels are workspace-scoped in schema.
    return (prisma as any).labels.findMany({
      where: { workspaceId },
      orderBy: [{ createdAt: "asc" }],
      select: {
        id: true,
        workspaceId: true,
        name: true,
        color: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }
}

export const boardsRepo = new BoardsRepo();
