import { z } from "zod";
import { Prisma } from "@prisma/client";

import { ApiError } from "../../common/errors/ApiError";
import { boardsRepo } from "./boards.repo";

export const createBoardInputSchema = z.object({
  workspaceId: z.string().uuid(),
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
  // PRIVATE = only board members can see; WORKSPACE = any workspace member can see.
  visibility: z.enum(["PRIVATE", "WORKSPACE"]).optional(),
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
      visibility: input.visibility ?? "PRIVATE",
      position: input.position === undefined ? null : new Prisma.Decimal(input.position),
    });

    // Board creator becomes OWNER of this board.
    await boardsRepo.addBoardMember({ boardId: board.id, userId, role: "OWNER" });

    return { board };
  }

  async list(userId: string, workspaceId: string) {
    const membership = await boardsRepo.isWorkspaceMember(workspaceId, userId);
    if (!membership) {
      throw new ApiError(403, "WORKSPACE_FORBIDDEN", "You are not a member of this workspace");
    }

    const boards = await boardsRepo.listByWorkspaceVisibleToUser(workspaceId, userId);
    return { boards };
  }

  async get(userId: string, boardId: string) {
    const board = await boardsRepo.findById(boardId);
    if (!board) throw new ApiError(404, "BOARD_NOT_FOUND", "Board not found");

    const wsMembership = await boardsRepo.isWorkspaceMember(board.workspaceId, userId);
    if (!wsMembership) {
      throw new ApiError(403, "WORKSPACE_FORBIDDEN", "You are not a member of this workspace");
    }

    if (board.visibility !== "WORKSPACE") {
      const boardMember = await boardsRepo.isBoardMember(board.id, userId);
      if (!boardMember) {
        // Hide the board existence when it is private.
        throw new ApiError(404, "BOARD_NOT_FOUND", "Board not found");
      }
    }

    return { board };
  }

  async getDetail(userId: string, boardId: string) {
    const board = await boardsRepo.findById(boardId);
    if (!board) throw new ApiError(404, "BOARD_NOT_FOUND", "Board not found");

    const wsMembership = await boardsRepo.isWorkspaceMember(board.workspaceId, userId);
    if (!wsMembership) {
      throw new ApiError(403, "WORKSPACE_FORBIDDEN", "You are not a member of this workspace");
    }

    if (board.visibility !== "WORKSPACE") {
      const boardMember = await boardsRepo.isBoardMember(board.id, userId);
      if (!boardMember) {
        // Hide the board existence when it is private.
        throw new ApiError(404, "BOARD_NOT_FOUND", "Board not found");
      }
    }

    const [lists, cards, members, labels] = await Promise.all([
      boardsRepo.listListsByBoard(boardId),
      boardsRepo.listCardsByBoard(boardId),
      boardsRepo.listBoardMembers(boardId),
      boardsRepo.listLabelsByWorkspace(board.workspaceId),
    ]);

    return { board, lists, cards, members, labels };
  }

  async update(userId: string, boardId: string, input: z.infer<typeof updateBoardInputSchema>) {
    const existing = await boardsRepo.findById(boardId);
    if (!existing) throw new ApiError(404, "BOARD_NOT_FOUND", "Board not found");

    const wsMembership = await boardsRepo.isWorkspaceMember(existing.workspaceId, userId);
    if (!wsMembership) throw new ApiError(403, "WORKSPACE_FORBIDDEN", "You are not a member of this workspace");

    const boardMember = await boardsRepo.isBoardMember(existing.id, userId);
    if (!boardMember) throw new ApiError(404, "BOARD_NOT_FOUND", "Board not found");
    if (boardMember.role !== "OWNER" && boardMember.role !== "ADMIN") {
      throw new ApiError(403, "BOARD_FORBIDDEN", "You are not allowed to update this board");
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

  async delete(userId: string, boardId: string) {
    const existing = await boardsRepo.findById(boardId);
    if (!existing) throw new ApiError(404, "BOARD_NOT_FOUND", "Board not found");

    const wsMembership = await boardsRepo.isWorkspaceMember(existing.workspaceId, userId);
    if (!wsMembership) throw new ApiError(403, "WORKSPACE_FORBIDDEN", "You are not a member of this workspace");

    const boardMember = await boardsRepo.isBoardMember(existing.id, userId);
    if (!boardMember) throw new ApiError(404, "BOARD_NOT_FOUND", "Board not found");
    if (boardMember.role !== "OWNER" && boardMember.role !== "ADMIN") {
      throw new ApiError(403, "BOARD_FORBIDDEN", "You are not allowed to delete this board");
    }

    await boardsRepo.update(boardId, { archivedAt: new Date() });
    return { ok: true };
  }

  async listMembers(userId: string, boardId: string) {
    const board = await boardsRepo.findById(boardId);
    if (!board) throw new ApiError(404, "BOARD_NOT_FOUND", "Board not found");

    const wsMembership = await boardsRepo.isWorkspaceMember(board.workspaceId, userId);
    if (!wsMembership) throw new ApiError(403, "WORKSPACE_FORBIDDEN", "You are not a member of this workspace");

    if (board.visibility !== "WORKSPACE") {
      const boardMember = await boardsRepo.isBoardMember(boardId, userId);
      if (!boardMember) throw new ApiError(404, "BOARD_NOT_FOUND", "Board not found");
    }

    const members = await boardsRepo.listBoardMembers(boardId);
    return { members };
  }

  async addMember(
    actorId: string,
    boardId: string,
    input: { userId: string; role?: "OWNER" | "ADMIN" | "MEMBER" },
  ) {
    const board = await boardsRepo.findById(boardId);
    if (!board) throw new ApiError(404, "BOARD_NOT_FOUND", "Board not found");

    const wsMembership = await boardsRepo.isWorkspaceMember(board.workspaceId, actorId);
    if (!wsMembership) throw new ApiError(403, "WORKSPACE_FORBIDDEN", "You are not a member of this workspace");

    const actorBoardMember = await boardsRepo.isBoardMember(boardId, actorId);
    if (!actorBoardMember) throw new ApiError(404, "BOARD_NOT_FOUND", "Board not found");
    if (actorBoardMember.role !== "OWNER" && actorBoardMember.role !== "ADMIN") {
      throw new ApiError(403, "BOARD_FORBIDDEN", "You are not allowed to manage board members");
    }

    const targetWsMembership = await boardsRepo.isWorkspaceMember(board.workspaceId, input.userId);
    if (!targetWsMembership) {
      throw new ApiError(400, "BOARD_MEMBER_INVALID", "User is not a member of this workspace");
    }

    const role = input.role ?? "MEMBER";
    const member = await boardsRepo.addBoardMember({ boardId, userId: input.userId, role });
    return { member };
  }

  async addMemberByEmail(
    actorId: string,
    boardId: string,
    input: { email: string; role?: "OWNER" | "ADMIN" | "MEMBER" },
  ) {
    const board = await boardsRepo.findById(boardId);
    if (!board) throw new ApiError(404, "BOARD_NOT_FOUND", "Board not found");

    const wsMembership = await boardsRepo.isWorkspaceMember(board.workspaceId, actorId);
    if (!wsMembership) throw new ApiError(403, "WORKSPACE_FORBIDDEN", "You are not a member of this workspace");

    const actorBoardMember = await boardsRepo.isBoardMember(boardId, actorId);
    if (!actorBoardMember) throw new ApiError(404, "BOARD_NOT_FOUND", "Board not found");
    if (actorBoardMember.role !== "OWNER" && actorBoardMember.role !== "ADMIN") {
      throw new ApiError(403, "BOARD_FORBIDDEN", "You are not allowed to manage board members");
    }

    const user = await boardsRepo.findUserByEmail(input.email);
    if (!user) throw new ApiError(400, "BOARD_MEMBER_INVALID", "User with this email does not exist");

    const targetWsMembership = await boardsRepo.isWorkspaceMember(board.workspaceId, user.id);
    if (!targetWsMembership) {
      throw new ApiError(400, "BOARD_MEMBER_INVALID", "User is not a member of this workspace");
    }

    const role = input.role ?? "MEMBER";
    const member = await boardsRepo.addBoardMember({ boardId, userId: user.id, role });
    return { member };
  }

  async removeMember(actorId: string, boardId: string, memberUserId: string) {
    const board = await boardsRepo.findById(boardId);
    if (!board) throw new ApiError(404, "BOARD_NOT_FOUND", "Board not found");

    const wsMembership = await boardsRepo.isWorkspaceMember(board.workspaceId, actorId);
    if (!wsMembership) throw new ApiError(403, "WORKSPACE_FORBIDDEN", "You are not a member of this workspace");

    const actorBoardMember = await boardsRepo.isBoardMember(boardId, actorId);
    if (!actorBoardMember) throw new ApiError(404, "BOARD_NOT_FOUND", "Board not found");
    if (actorBoardMember.role !== "OWNER" && actorBoardMember.role !== "ADMIN") {
      throw new ApiError(403, "BOARD_FORBIDDEN", "You are not allowed to manage board members");
    }

    // Prevent removing yourself if you're the last OWNER (simple guard)
    if (memberUserId === actorId && actorBoardMember.role === "OWNER") {
      const members = await boardsRepo.listBoardMembers(boardId);
      const ownerCount = members.filter((m: any) => m.role === "OWNER").length;
      if (ownerCount <= 1) {
        throw new ApiError(400, "BOARD_OWNER_REQUIRED", "Board must have at least one OWNER");
      }
    }

    await boardsRepo.removeBoardMember(boardId, memberUserId);
    return { ok: true };
  }
}

export const boardsService = new BoardsService();
