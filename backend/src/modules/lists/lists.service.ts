import { Prisma } from "@prisma/client";
import { z } from "zod";

import { ApiError } from "../../common/errors/ApiError";
import { computeBetweenPosition } from "../../common/utils/position";
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

    const boardMember = await listsRepo.isBoardMember(board.id, userId);
    if (!boardMember) {
      // WORKSPACE boards are readable by workspace members, but write operations require board membership.
      throw new ApiError(403, "BOARD_FORBIDDEN", "Board is read-only for non-members");
    }

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

    if (board.visibility !== "WORKSPACE") {
      const boardMember = await listsRepo.isBoardMember(board.id, userId);
      if (!boardMember) {
        // Option B: workspace OWNER/ADMIN can read PRIVATE boards in read-only mode.
        if (membership.role !== "OWNER" && membership.role !== "ADMIN") {
          throw new ApiError(404, "BOARD_NOT_FOUND", "Board not found");
        }
      }
    }

    const lists = await listsRepo.listByBoard(boardId);
    return { lists };
  }

  async get(userId: string, listId: string) {
    const list = await listsRepo.findById(listId);
    if (!list) throw new ApiError(404, "LIST_NOT_FOUND", "List not found");

    const membership = await listsRepo.isWorkspaceMember(list.board.workspaceId, userId);
    if (!membership) throw new ApiError(403, "WORKSPACE_FORBIDDEN", "You are not a member of this workspace");

    const boardId = list.boardId;
    // List detail should follow the board visibility rules.
    const board = await listsRepo.findBoard(boardId);
    if (!board || board.archivedAt) throw new ApiError(404, "BOARD_NOT_FOUND", "Board not found");
    if (board.visibility !== "WORKSPACE") {
      const boardMember = await listsRepo.isBoardMember(board.id, userId);
      if (!boardMember) {
        if (membership.role !== "OWNER" && membership.role !== "ADMIN") {
          throw new ApiError(404, "BOARD_NOT_FOUND", "Board not found");
        }
      }
    }

    return { list };
  }

  async update(userId: string, listId: string, input: z.infer<typeof updateListInputSchema>) {
    const existing = await listsRepo.findById(listId);
    if (!existing) throw new ApiError(404, "LIST_NOT_FOUND", "List not found");

    const membership = await listsRepo.isWorkspaceMember(existing.board.workspaceId, userId);
    if (!membership) throw new ApiError(403, "WORKSPACE_FORBIDDEN", "You are not a member of this workspace");

    const boardMember = await listsRepo.isBoardMember(existing.boardId, userId);
    if (!boardMember) {
      throw new ApiError(403, "BOARD_FORBIDDEN", "Board is read-only for non-members");
    }

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

  async move(
    userId: string,
    listId: string,
    input: { prevId?: string | null; nextId?: string | null },
  ) {
    const existing = await listsRepo.findById(listId);
    if (!existing) throw new ApiError(404, "LIST_NOT_FOUND", "List not found");

    const board = await listsRepo.findBoard(existing.boardId);
    if (!board || board.archivedAt) throw new ApiError(404, "BOARD_NOT_FOUND", "Board not found");

    const membership = await listsRepo.isWorkspaceMember(existing.board.workspaceId, userId);
    if (!membership) throw new ApiError(403, "WORKSPACE_FORBIDDEN", "You are not a member of this workspace");

    const boardMember = await listsRepo.isBoardMember(existing.boardId, userId);
    if (!boardMember) {
      throw new ApiError(403, "BOARD_FORBIDDEN", "Board is read-only for non-members");
    }

    const prev = input.prevId ? await listsRepo.findListPosition(input.prevId) : null;
    const next = input.nextId ? await listsRepo.findListPosition(input.nextId) : null;

    if (prev && prev.boardId !== existing.boardId) {
      throw new ApiError(400, "LIST_MOVE_INVALID", "prevId must belong to the same board");
    }
    if (next && next.boardId !== existing.boardId) {
      throw new ApiError(400, "LIST_MOVE_INVALID", "nextId must belong to the same board");
    }

    const position = computeBetweenPosition(prev?.position, next?.position);
    const list = await listsRepo.updatePosition(listId, position);
    return { list };
  }

  async delete(userId: string, listId: string) {
    const existing = await listsRepo.findById(listId);
    if (!existing) throw new ApiError(404, "LIST_NOT_FOUND", "List not found");

    const board = await listsRepo.findBoard(existing.boardId);
    if (!board || board.archivedAt) throw new ApiError(404, "BOARD_NOT_FOUND", "Board not found");

    const membership = await listsRepo.isWorkspaceMember(existing.board.workspaceId, userId);
    if (!membership) throw new ApiError(403, "WORKSPACE_FORBIDDEN", "You are not a member of this workspace");

    const boardMember = await listsRepo.isBoardMember(existing.boardId, userId);
    if (!boardMember) {
      throw new ApiError(403, "BOARD_FORBIDDEN", "Board is read-only for non-members");
    }

    // Soft delete list
    await listsRepo.update(listId, { archivedAt: new Date() });

    // Soft delete cards in this list as well (keeps referential integrity & hides from queries)
    await listsRepo.archiveCardsByList(listId);

    return { ok: true };
  }
}

export const listsService = new ListsService();
