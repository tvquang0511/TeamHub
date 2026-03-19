import { Prisma } from "@prisma/client";
import { z } from "zod";

import { ApiError } from "../../common/errors/ApiError";
import { cardsRepo } from "./cards.repo";

export const createCardInputSchema = z.object({
  listId: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  dueAt: z.string().datetime().optional(),
  position: z.number().optional(),
});

export const updateCardInputSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).nullable().optional(),
  dueAt: z.string().datetime().nullable().optional(),
  position: z.number().nullable().optional(),
  archived: z.boolean().optional(),
  // allow moving card to another list (within same workspace)
  listId: z.string().uuid().optional(),
});

export class CardsService {
  async create(userId: string, input: z.infer<typeof createCardInputSchema>) {
    const list = await cardsRepo.findList(input.listId);
    if (!list || list.archivedAt || list.board.archivedAt) {
      throw new ApiError(404, "LIST_NOT_FOUND", "List not found");
    }

    const membership = await cardsRepo.isWorkspaceMember(list.board.workspaceId, userId);
    if (!membership) throw new ApiError(403, "WORKSPACE_FORBIDDEN", "You are not a member of this workspace");

    const dueAt = input.dueAt ? new Date(input.dueAt) : null;

    const card = await cardsRepo.create({
      listId: input.listId,
      title: input.title,
      description: input.description ?? null,
      dueAt,
      position: new Prisma.Decimal(input.position ?? Date.now()),
    });

    return { card };
  }

  async list(userId: string, listId: string) {
    const list = await cardsRepo.findList(listId);
    if (!list || list.archivedAt || list.board.archivedAt) {
      throw new ApiError(404, "LIST_NOT_FOUND", "List not found");
    }

    const membership = await cardsRepo.isWorkspaceMember(list.board.workspaceId, userId);
    if (!membership) throw new ApiError(403, "WORKSPACE_FORBIDDEN", "You are not a member of this workspace");

    const cards = await cardsRepo.listByList(listId);
    return { cards };
  }

  async get(userId: string, cardId: string) {
    const card = await cardsRepo.findById(cardId);
    if (!card) throw new ApiError(404, "CARD_NOT_FOUND", "Card not found");

    const workspaceId = card.list.board.workspaceId;
    const membership = await cardsRepo.isWorkspaceMember(workspaceId, userId);
    if (!membership) throw new ApiError(403, "WORKSPACE_FORBIDDEN", "You are not a member of this workspace");

    return { card };
  }

  async update(userId: string, cardId: string, input: z.infer<typeof updateCardInputSchema>) {
    const existing = await cardsRepo.findById(cardId);
    if (!existing) throw new ApiError(404, "CARD_NOT_FOUND", "Card not found");

    const existingWorkspaceId = existing.list.board.workspaceId;
    const membership = await cardsRepo.isWorkspaceMember(existingWorkspaceId, userId);
    if (!membership) throw new ApiError(403, "WORKSPACE_FORBIDDEN", "You are not a member of this workspace");

    let nextListId: string | undefined = undefined;
    if (input.listId) {
      const nextList = await cardsRepo.findList(input.listId);
      if (!nextList || nextList.archivedAt || nextList.board.archivedAt) {
        throw new ApiError(404, "LIST_NOT_FOUND", "List not found");
      }
      if (nextList.board.workspaceId !== existingWorkspaceId) {
        throw new ApiError(400, "CARD_MOVE_INVALID", "Cannot move card to a different workspace");
      }
      nextListId = input.listId;
    }

    const archivedAt = input.archived === undefined ? undefined : input.archived ? new Date() : null;
    const dueAt = input.dueAt === undefined ? undefined : input.dueAt === null ? null : new Date(input.dueAt);

    const card = await cardsRepo.update(cardId, {
      title: input.title,
      description: input.description ?? undefined,
      dueAt,
      position:
        input.position === undefined
          ? undefined
          : input.position === null
            ? null
            : new Prisma.Decimal(input.position),
      archivedAt,
      listId: nextListId,
    });

    return { card };
  }
}

export const cardsService = new CardsService();
