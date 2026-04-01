import { z } from "zod";
import { Prisma } from "@prisma/client";

import { ApiError } from "../../common/errors/ApiError";
import env from "../../config/env";
import {
  bumpBoardCacheVersion,
  cacheGetJson,
  cacheKey,
  cacheSetJson,
  getBoardCacheVersion,
} from "../../integrations/cache/redisCache";
import { boardsRepo } from "./boards.repo";

export const createBoardInputSchema = z.object({
  workspaceId: z.string().uuid(),
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
  // PRIVATE = only board members can see; WORKSPACE = any workspace member can see.
  visibility: z.enum(["PRIVATE", "WORKSPACE"]).optional(),
  backgroundColor: z.string().max(30).optional(),
  backgroundLeftColor: z.string().max(30).optional(),
  backgroundRightColor: z.string().max(30).optional(),
  backgroundSplitPct: z.number().int().min(0).max(100).optional(),
  // position is numeric(65,30); we accept number for MVP.
  position: z.number().optional(),
});

export const updateBoardInputSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(2000).nullable().optional(),
  position: z.number().nullable().optional(),
  visibility: z.enum(["PRIVATE", "WORKSPACE"]).optional(),
  backgroundColor: z.string().max(30).nullable().optional(),
  backgroundLeftColor: z.string().max(30).nullable().optional(),
  backgroundRightColor: z.string().max(30).nullable().optional(),
  backgroundSplitPct: z.number().int().min(0).max(100).nullable().optional(),
  archived: z.boolean().optional(),
});

export const updateBoardVisibilityInputSchema = z.object({
  visibility: z.enum(["PRIVATE", "WORKSPACE"]),
});

export const updateBoardBackgroundInputSchema = z
  .object({
    backgroundColor: z.string().max(30).nullable().optional(),
    backgroundLeftColor: z.string().max(30).nullable().optional(),
    backgroundRightColor: z.string().max(30).nullable().optional(),
    backgroundSplitPct: z.number().int().min(0).max(100).nullable().optional(),
  })
  .refine(
    (v) =>
      v.backgroundColor !== undefined ||
      v.backgroundLeftColor !== undefined ||
      v.backgroundRightColor !== undefined ||
      v.backgroundSplitPct !== undefined,
    { message: "At least one background field must be provided" },
  );

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
      backgroundLeftColor: input.backgroundLeftColor ?? null,
      backgroundRightColor: input.backgroundRightColor ?? null,
      backgroundSplitPct: input.backgroundSplitPct ?? null,
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
    return {
      boards: (boards as any[]).map((b) => {
        const boardMemberRole = Array.isArray(b.members) && b.members.length > 0 ? b.members[0]?.role : undefined;
        const actor = this.buildBoardActorPermissions({
          workspaceRole: membership.role,
          boardVisibility: b.visibility,
          boardMemberRole,
        });

        // Don't leak the board member relation in list payload; keep only actor.
        const { members: _members, ...rest } = b as any;
        return { ...rest, actor };
      }),
    };
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
        avatarUrl: m.user?.avatarUrl ?? null,
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
    await bumpBoardCacheVersion(boardId);
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

    // Cache board view payload (lists + cards + members + labels).
    // Do NOT cache `actor` because it's user-specific.
    const boardVer = await getBoardCacheVersion(boardId);
    const cacheKeyStr = cacheKey("board", boardId, "detail", "ver", String(boardVer));

    const cached = await cacheGetJson<{
      board: any;
      lists: any[];
      cards: any[];
      members: any[];
      labels: any[];
    }>(cacheKeyStr);

    const actor = this.buildBoardActorPermissions({
      workspaceRole: wsMembership.role,
      boardVisibility: board.visibility,
      boardMemberRole: boardMember?.role,
    });

    if (cached) {
      return { ...cached, actor };
    }

    const [lists, cards, members, labels] = await Promise.all([
      boardsRepo.listListsByBoard(boardId),
      boardsRepo.listCardsByBoard(boardId),
      boardsRepo.listBoardMembers(boardId),
      boardsRepo.listLabelsByBoard(boardId),
    ]);

    // Normalize card.labels shape for API clients:
    // Prisma returns [{ label: {...} }], we expose [{...}]
    const normalizedCards = (cards as any[]).map((c) => ({
      ...c,
      labels: (c.cardLabels || []).map((cl: any) => cl.label),
    }));

    const responseBase = { board, lists, cards: normalizedCards, members, labels };
    await cacheSetJson(cacheKeyStr, responseBase, env.CACHE_BOARD_VIEW_TTL_SEC);

    return { ...responseBase, actor };
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
      backgroundLeftColor:
        input.backgroundLeftColor === undefined ? undefined : input.backgroundLeftColor,
      backgroundRightColor:
        input.backgroundRightColor === undefined ? undefined : input.backgroundRightColor,
      backgroundSplitPct:
        input.backgroundSplitPct === undefined ? undefined : input.backgroundSplitPct,
      position:
        input.position === undefined
          ? undefined
          : input.position === null
            ? null
            : new Prisma.Decimal(input.position),
      archivedAt,
    });

    await bumpBoardCacheVersion(boardId);
    return { board };
  }

  async updateVisibility(
    userId: string,
    boardId: string,
    input: z.infer<typeof updateBoardVisibilityInputSchema>,
  ) {
    const existing = await boardsRepo.findById(boardId);
    if (!existing) throw new ApiError(404, "BOARD_NOT_FOUND", "Board not found");

    const wsMembership = await boardsRepo.isWorkspaceMember(existing.workspaceId, userId);
    if (!wsMembership) {
      throw new ApiError(403, "WORKSPACE_FORBIDDEN", "You are not a member of this workspace");
    }

    const boardMember = await boardsRepo.isBoardMember(existing.id, userId);
    // Policy: only board OWNER/ADMIN can update board settings.
    if (!boardMember) throw new ApiError(404, "BOARD_NOT_FOUND", "Board not found");
    if (boardMember.role !== "OWNER" && boardMember.role !== "ADMIN") {
      throw new ApiError(403, "BOARD_FORBIDDEN", "You are not allowed to update this board");
    }

    const board = await boardsRepo.update(boardId, { visibility: input.visibility });
    await bumpBoardCacheVersion(boardId);
    return { board };
  }

  async updateBackground(
    userId: string,
    boardId: string,
    input: z.infer<typeof updateBoardBackgroundInputSchema>,
  ) {
    const existing = await boardsRepo.findById(boardId);
    if (!existing) throw new ApiError(404, "BOARD_NOT_FOUND", "Board not found");

    const wsMembership = await boardsRepo.isWorkspaceMember(existing.workspaceId, userId);
    if (!wsMembership) {
      throw new ApiError(403, "WORKSPACE_FORBIDDEN", "You are not a member of this workspace");
    }

    const boardMember = await boardsRepo.isBoardMember(existing.id, userId);
    // Policy: only board OWNER/ADMIN can update board settings.
    if (!boardMember) throw new ApiError(404, "BOARD_NOT_FOUND", "Board not found");
    if (boardMember.role !== "OWNER" && boardMember.role !== "ADMIN") {
      throw new ApiError(403, "BOARD_FORBIDDEN", "You are not allowed to update this board");
    }

    const board = await boardsRepo.update(boardId, {
      backgroundColor:
        input.backgroundColor === undefined ? undefined : input.backgroundColor,
      backgroundLeftColor:
        input.backgroundLeftColor === undefined ? undefined : input.backgroundLeftColor,
      backgroundRightColor:
        input.backgroundRightColor === undefined ? undefined : input.backgroundRightColor,
      backgroundSplitPct:
        input.backgroundSplitPct === undefined ? undefined : input.backgroundSplitPct,
    });

    await bumpBoardCacheVersion(boardId);
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
    await bumpBoardCacheVersion(boardId);
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
    await bumpBoardCacheVersion(boardId);
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
    await bumpBoardCacheVersion(boardId);
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
    await bumpBoardCacheVersion(boardId);
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
    await bumpBoardCacheVersion(boardId);
    return { ok: true };
  }
}

export const boardsService = new BoardsService();
