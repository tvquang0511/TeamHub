import { Prisma } from "@prisma/client";
import { z } from "zod";

import { ApiError } from "../../common/errors/ApiError";
import { listsRepo } from "./lists.repo";

export const createListInputSchema = z.object({
  boardId: z.string().uuid(),
  name: z.string().min(1).max(120),
  position: z.number().optional(),
});

export const updateListInputSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  position: z.number().nullable().optional(),
  archived: z.boolean().optional(),
});

export class ListsService {
  async create(userId: string, input: z.infer<typeof createListInputSchema>) {
    const board = await listsRepo.findBoard(input.boardId);
    if (!board || board.archivedAt) throw new ApiError(404, "BOARD_NOT_FOUND", "Board not found");

    const membership = await listsRepo.isWorkspaceMember(board.workspaceId, userId);
    if (!membership) throw new ApiError(403, "WORKSPACE_FORBIDDEN", "You are not a member of this workspace");

    const list = await listsRepo.create({
      boardId: input.boardId,
      name: input.name,
      position: new Prisma.Decimal(input.position ?? Date.now()),
    });

    return { list };
  }

  async list(userId: string, boardId: string) {
    const board = await listsRepo.findBoard(boardId);
    if (!board || board.archivedAt) throw new ApiError(404, "BOARD_NOT_FOUND", "Board not found");

    const membership = await listsRepo.isWorkspaceMember(board.workspaceId, userId);
    if (!membership) throw new ApiError(403, "WORKSPACE_FORBIDDEN", "You are not a member of this workspace");

    const lists = await listsRepo.listByBoard(boardId);
    return { lists };
  }

  async get(userId: string, listId: string) {
    const list = await listsRepo.findById(listId);
    if (!list) throw new ApiError(404, "LIST_NOT_FOUND", "List not found");

    const membership = await listsRepo.isWorkspaceMember(list.board.workspaceId, userId);
    if (!membership) throw new ApiError(403, "WORKSPACE_FORBIDDEN", "You are not a member of this workspace");

    return { list };
  }

  async update(userId: string, listId: string, input: z.infer<typeof updateListInputSchema>) {
    const existing = await listsRepo.findById(listId);
    if (!existing) throw new ApiError(404, "LIST_NOT_FOUND", "List not found");

    const membership = await listsRepo.isWorkspaceMember(existing.board.workspaceId, userId);
    if (!membership) throw new ApiError(403, "WORKSPACE_FORBIDDEN", "You are not a member of this workspace");

    const archivedAt = input.archived === undefined ? undefined : input.archived ? new Date() : null;

    const list = await listsRepo.update(listId, {
      name: input.name,
      position:
        input.position === undefined
          ? undefined
          : input.position === null
            ? null
            : new Prisma.Decimal(input.position),
      archivedAt,
    });

    return { list };
  }
}

export const listsService = new ListsService();
