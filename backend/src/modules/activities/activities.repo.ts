import { Prisma, activity_type } from "@prisma/client";

import prisma from "../../db/prisma";

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
};
