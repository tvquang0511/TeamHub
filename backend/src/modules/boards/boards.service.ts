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
  backgroundColor: z.string().max(30).optional(),
  // position is numeric(65,30); we accept number for MVP.
  position: z.number().optional(),
});

export const updateBoardInputSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(2000).nullable().optional(),
  position: z.number().nullable().optional(),
  visibility: z.enum(["PRIVATE", "WORKSPACE"]).optional(),
  backgroundColor: z.string().max(30).nullable().optional(),
  archived: z.boolean().optional(),
});

export class BoardsService {
  private buildBoardActorPermissions(params: {
    workspaceRole: "OWNER" | "ADMIN" | "MEMBER";
    boardVisibility: "PRIVATE" | "WORKSPACE";
    boardMemberRole?: "OWNER" | "ADMIN" | "MEMBER";
  }) {
    const isBoardMember = Boolean(params.boardMemberRole);
    const isWorkspaceAdmin = params.workspaceRole === "OWNER" || params.workspaceRole === "ADMIN";
    const isBoardAdmin = params.boardMemberRole === "OWNER" || params.boardMemberRole === "ADMIN";

    // Company safety policy:
    // - Workspace OWNER/ADMIN may read PRIVATE boards in read-only mode even when not a board member.
    // - Workspace OWNER/ADMIN may delete (archive) any board in the workspace.
    const canReadBoard =
      params.boardVisibility === "WORKSPACE" || isBoardMember || isWorkspaceAdmin;
    const canWriteBoard = isBoardMember;
    const canManageBoardMembers = isBoardAdmin;
    const canInviteToBoard = isBoardAdmin;
    const canUpdateBoardSettings = isBoardAdmin;
    const canDeleteBoard = isBoardAdmin || isWorkspaceAdmin;
    const canLeaveBoard = isBoardMember;

    const readOnlyReason =
      canReadBoard && !canWriteBoard
        ? isWorkspaceAdmin && !isBoardMember
          ? "WORKSPACE_ADMIN_READ_ONLY"
          : "WORKSPACE_READ_ONLY"
        : null;

    return {
      workspaceRole: params.workspaceRole,
      boardVisibility: params.boardVisibility,
      isBoardMember,
      boardRole: params.boardMemberRole ?? null,
      canReadBoard,
      canWriteBoard,
      canManageBoardMembers,
      canInviteToBoard,
      canUpdateBoardSettings,
      canDeleteBoard,
      canLeaveBoard,
      readOnlyReason,
    };
  }
  async create(userId: string, input: z.infer<typeof createBoardInputSchema>) {
    const membership = await boardsRepo.isWorkspaceMember(input.workspaceId, userId);
    if (!membership) {
      throw new ApiError(403, "WORKSPACE_FORBIDDEN", "You are not a member of this workspace");
    }
    if (membership.role !== "OWNER" && membership.role !== "ADMIN") {
      throw new ApiError(403, "WORKSPACE_FORBIDDEN", "Insufficient workspace role to create board");
    }

    const board = await boardsRepo.create({
      workspaceId: input.workspaceId,
      name: input.name,
      description: input.description ?? null,
      visibility: input.visibility ?? "PRIVATE",
      backgroundColor: input.backgroundColor ?? null,
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

    const boardMember = await boardsRepo.isBoardMember(board.id, userId);

    if (board.visibility !== "WORKSPACE") {
      if (!boardMember) {
        // Option B: workspace OWNER/ADMIN can view PRIVATE boards in read-only mode.
        if (wsMembership.role !== "OWNER" && wsMembership.role !== "ADMIN") {
          // Hide the board existence when it is private.
          throw new ApiError(404, "BOARD_NOT_FOUND", "Board not found");
        }
      }
    }

    const actor = this.buildBoardActorPermissions({
      workspaceRole: wsMembership.role,
      boardVisibility: board.visibility,
      boardMemberRole: boardMember?.role,
    });

    return { board, actor };
  }

  async listMembers(userId: string, boardId: string) {
    const board = await boardsRepo.findById(boardId);
    if (!board) throw new ApiError(404, "BOARD_NOT_FOUND", "Board not found");

    const wsMembership = await boardsRepo.isWorkspaceMember(board.workspaceId, userId);
    if (!wsMembership) {
      throw new ApiError(403, "WORKSPACE_FORBIDDEN", "You are not a member of this workspace");
    }

    const actor = await boardsRepo.isBoardMember(boardId, userId);
    if (!actor) throw new ApiError(403, "BOARD_FORBIDDEN", "Not a board member");

    const members = await boardsRepo.listBoardMembers(boardId);
    return {
      members: members.map((m: any) => ({
        id: m.id,
        userId: m.userId,
        email: m.user?.email,
        displayName: m.user?.displayName,
        role: m.role,
        createdAt: m.createdAt,
      })),
    };
  }

  async updateMemberRole(
    actorId: string,
    boardId: string,
    targetUserId: string,
    role: "ADMIN" | "MEMBER",
  ) {
    const board = await boardsRepo.findById(boardId);
    if (!board) throw new ApiError(404, "BOARD_NOT_FOUND", "Board not found");

    // Only board OWNER/ADMIN can update board member roles.
    const actor = await boardsRepo.isBoardMember(boardId, actorId);
    if (!actor) throw new ApiError(403, "BOARD_FORBIDDEN", "Not a board member");
    if (actor.role !== "OWNER" && actor.role !== "ADMIN") {
      throw new ApiError(403, "BOARD_FORBIDDEN", "Insufficient board role");
    }

    const target = await boardsRepo.isBoardMember(boardId, targetUserId);
    if (!target) throw new ApiError(404, "BOARD_MEMBER_NOT_FOUND", "Member not found");
    if (target.role === "OWNER") {
      throw new ApiError(400, "BOARD_MEMBER_INVALID", "Cannot change OWNER role");
    }

    await boardsRepo.updateBoardMemberRole(boardId, targetUserId, role);
    return { ok: true };
  }

  async getDetail(userId: string, boardId: string) {
    const board = await boardsRepo.findById(boardId);
    if (!board) throw new ApiError(404, "BOARD_NOT_FOUND", "Board not found");

    const wsMembership = await boardsRepo.isWorkspaceMember(board.workspaceId, userId);
    if (!wsMembership) {
      throw new ApiError(403, "WORKSPACE_FORBIDDEN", "You are not a member of this workspace");
    }

    const boardMember = await boardsRepo.isBoardMember(board.id, userId);

    if (board.visibility !== "WORKSPACE") {
      if (!boardMember) {
        // Option B: workspace OWNER/ADMIN can view PRIVATE boards in read-only mode.
        if (wsMembership.role !== "OWNER" && wsMembership.role !== "ADMIN") {
          // Hide the board existence when it is private.
          throw new ApiError(404, "BOARD_NOT_FOUND", "Board not found");
        }
      }
    }

    const [lists, cards, members, labels] = await Promise.all([
      boardsRepo.listListsByBoard(boardId),
      boardsRepo.listCardsByBoard(boardId),
      boardsRepo.listBoardMembers(boardId),
      boardsRepo.listLabelsByWorkspace(board.workspaceId),
    ]);

    const actor = this.buildBoardActorPermissions({
      workspaceRole: wsMembership.role,
      boardVisibility: board.visibility,
      boardMemberRole: boardMember?.role,
    });

    return { board, lists, cards, members, labels, actor };
  }

  async update(userId: string, boardId: string, input: z.infer<typeof updateBoardInputSchema>) {
    const existing = await boardsRepo.findById(boardId);
    if (!existing) throw new ApiError(404, "BOARD_NOT_FOUND", "Board not found");

    const wsMembership = await boardsRepo.isWorkspaceMember(existing.workspaceId, userId);
    if (!wsMembership) throw new ApiError(403, "WORKSPACE_FORBIDDEN", "You are not a member of this workspace");

    const boardMember = await boardsRepo.isBoardMember(existing.id, userId);
    // Policy: only board OWNER/ADMIN can update board settings.
    // Workspace OWNER/ADMIN may read private boards in read-only mode, but cannot update settings unless they're a board admin.
    if (!boardMember) throw new ApiError(404, "BOARD_NOT_FOUND", "Board not found");
    if (boardMember.role !== "OWNER" && boardMember.role !== "ADMIN") {
      throw new ApiError(403, "BOARD_FORBIDDEN", "You are not allowed to update this board");
    }

    const archivedAt =
      input.archived === undefined ? undefined : input.archived ? new Date() : null;

    const board = await boardsRepo.update(boardId, {
      name: input.name,
      description: input.description ?? undefined,
      visibility: input.visibility,
      backgroundColor:
        input.backgroundColor === undefined ? undefined : input.backgroundColor,
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
    if (!boardMember) {
      // Company safety policy: workspace OWNER/ADMIN may delete (archive) any board.
      if (wsMembership.role !== "OWNER" && wsMembership.role !== "ADMIN") {
        throw new ApiError(404, "BOARD_NOT_FOUND", "Board not found");
      }
    } else if (boardMember.role !== "OWNER" && boardMember.role !== "ADMIN") {
      // If user is on the board but not admin/owner, still deny.
      throw new ApiError(403, "BOARD_FORBIDDEN", "You are not allowed to delete this board");
    }

    await boardsRepo.update(boardId, { archivedAt: new Date() });
    return { ok: true };
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

  async leaveBoard(userId: string, boardId: string) {
    const board = await boardsRepo.findById(boardId);
    if (!board) throw new ApiError(404, "BOARD_NOT_FOUND", "Board not found");

    const wsMembership = await boardsRepo.isWorkspaceMember(board.workspaceId, userId);
    if (!wsMembership) {
      throw new ApiError(403, "WORKSPACE_FORBIDDEN", "You are not a member of this workspace");
    }

    const actorBoardMember = await boardsRepo.isBoardMember(boardId, userId);
    if (!actorBoardMember) {
      throw new ApiError(400, "BOARD_MEMBER_INVALID", "You are not a member of this board");
    }

    // Prevent leaving if you're the last OWNER.
    if (actorBoardMember.role === "OWNER") {
      const members = await boardsRepo.listBoardMembers(boardId);
      const ownerCount = members.filter((m: any) => m.role === "OWNER").length;
      if (ownerCount <= 1) {
        throw new ApiError(400, "BOARD_OWNER_REQUIRED", "Board must have at least one OWNER");
      }
    }

    await boardsRepo.removeBoardMember(boardId, userId);
    return { ok: true };
  }
}

export const boardsService = new BoardsService();
