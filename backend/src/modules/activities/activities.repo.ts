import { Prisma, activity_type } from "@prisma/client";

import prisma from "../../infrastructure/database/prisma";

export type CreateActivityInput = {
  actorId: string;
  workspaceId?: string | null;
  boardId?: string | null;
  cardId?: string | null;
  type: activity_type;
  payload?: Prisma.InputJsonValue | null;
};

export const activitiesRepo = {
  create: async (input: CreateActivityInput) => {
    return prisma.activities.create({
      data: {
        actorId: input.actorId,
        workspaceId: input.workspaceId ?? null,
        boardId: input.boardId ?? null,
        cardId: input.cardId ?? null,
        type: input.type,
        payload: input.payload === null ? Prisma.JsonNull : input.payload,
      },
      select: { id: true },
    });
  },
  createSafe: async (input: CreateActivityInput) => {
    try {
      await activitiesRepo.create(input);
    } catch {
      // Best-effort: activity logging should not break primary operations.
    }
  },
  listByBoard: async (boardId: string, limit = 50) => {
    return prisma.activities.findMany({
      where: { boardId },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        actor: {
          select: { id: true, email: true, displayName: true, avatarUrl: true },
        },
        card: {
          select: { id: true, title: true },
        },
      },
    });
  },
  listByCard: async (cardId: string, limit = 50) => {
    return prisma.activities.findMany({
      where: { cardId },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        actor: {
          select: { id: true, email: true, displayName: true, avatarUrl: true },
        },
      },
    });
  },
  listByWorkspace: async (workspaceId: string, limit = 50) => {
    return prisma.activities.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        actor: {
          select: { id: true, email: true, displayName: true, avatarUrl: true },
        },
        board: {
          select: { id: true, name: true },
        },
      },
    });
  },
  pruneOldActivities: async (daysAgo: number) => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysAgo);
    return prisma.activities.deleteMany({
      where: {
        createdAt: { lt: cutoff },
      },
    });
  },
};
