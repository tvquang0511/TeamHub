import { z } from "zod";
import { Prisma } from "@prisma/client";

import { ApiError } from "../../common/errors/ApiError";
import { boardsRepo } from "./boards.repo";

export const createBoardInputSchema = z.object({
  workspaceId: z.string().uuid(),
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
  // position is numeric(65,30); we accept number for MVP.
  position: z.number().optional(),
});

export const updateBoardInputSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(2000).nullable().optional(),
  position: z.number().nullable().optional(),
  archived: z.boolean().optional(),
});

export class BoardsService {
  async create(userId: string, input: z.infer<typeof createBoardInputSchema>) {
    const membership = await boardsRepo.isWorkspaceMember(input.workspaceId, userId);
    if (!membership) {
      throw new ApiError(403, "WORKSPACE_FORBIDDEN", "You are not a member of this workspace");
    }

    const board = await boardsRepo.create({
      workspaceId: input.workspaceId,
      name: input.name,
      description: input.description ?? null,
      position: input.position === undefined ? null : new Prisma.Decimal(input.position),
    });

    return { board };
  }

  async list(userId: string, workspaceId: string) {
    const membership = await boardsRepo.isWorkspaceMember(workspaceId, userId);
    if (!membership) {
      throw new ApiError(403, "WORKSPACE_FORBIDDEN", "You are not a member of this workspace");
    }

    const boards = await boardsRepo.listByWorkspace(workspaceId);
    return { boards };
  }

  async get(userId: string, boardId: string) {
    const board = await boardsRepo.findById(boardId);
    if (!board) throw new ApiError(404, "BOARD_NOT_FOUND", "Board not found");

    const membership = await boardsRepo.isWorkspaceMember(board.workspaceId, userId);
    if (!membership) {
      throw new ApiError(403, "WORKSPACE_FORBIDDEN", "You are not a member of this workspace");
    }

    return { board };
  }

  async update(userId: string, boardId: string, input: z.infer<typeof updateBoardInputSchema>) {
    const existing = await boardsRepo.findById(boardId);
    if (!existing) throw new ApiError(404, "BOARD_NOT_FOUND", "Board not found");

    const membership = await boardsRepo.isWorkspaceMember(existing.workspaceId, userId);
    if (!membership) {
      throw new ApiError(403, "WORKSPACE_FORBIDDEN", "You are not a member of this workspace");
    }

    const archivedAt =
      input.archived === undefined ? undefined : input.archived ? new Date() : null;

    const board = await boardsRepo.update(boardId, {
      name: input.name,
      description: input.description ?? undefined,
      position:
        input.position === undefined
          ? undefined
          : input.position === null
            ? null
            : new Prisma.Decimal(input.position),
      archivedAt,
    });

    return { board };
  }
}

export const boardsService = new BoardsService();
