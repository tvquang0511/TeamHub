import { ApiError } from "../../common/errors/ApiError";
import { boardsRepo } from "../boards/boards.repo";
import { cardsRepo } from "../cards/cards.repo";
import { activitiesRepo } from "../activities/activities.repo";
import { activity_type } from "@prisma/client";
import { assigneesRepo } from "./assignees.repo";

export class AssigneesService {
  private async assertCardAndMembership(userId: string, cardId: string) {
    const card = await cardsRepo.findCardWorkspaceAndBoard(cardId);
    if (!card || card.archivedAt || card.list.archivedAt || card.list.board.archivedAt) {
      throw new ApiError(404, "CARD_NOT_FOUND", "Card not found");
    }

    const wsMembership = await boardsRepo.isWorkspaceMember(card.list.board.workspaceId, userId);
    if (!wsMembership) throw new ApiError(403, "WORKSPACE_FORBIDDEN", "You are not a member of this workspace");

    const boardMember = await boardsRepo.isBoardMember(card.list.board.id, userId);
    if (!boardMember) throw new ApiError(403, "BOARD_FORBIDDEN", "Board is read-only for non-members");

    return { card, boardMember };
  }

  async list(userId: string, cardId: string) {
    await this.assertCardAndMembership(userId, cardId);
    const assignees: any[] = (await assigneesRepo.listByCard(cardId)) as any;
    return {
      assignees: assignees.map((a) => ({
        id: a.user.id,
        email: a.user.email,
        displayName: a.user.displayName,
        avatarUrl: (a.user as any).avatarUrl ?? undefined,
        assignedAt: a.createdAt,
      })),
    };
  }

  async assignSelf(userId: string, cardId: string) {
    const { card } = await this.assertCardAndMembership(userId, cardId);

    try {
      const created = await assigneesRepo.assign(cardId, userId);
      const c: any = created as any;
      await activitiesRepo.createSafe({
        actorId: userId,
        workspaceId: card.list.board.workspaceId,
        boardId: card.list.board.id,
        cardId: card.id,
        type: activity_type.ASSIGNEE_ADDED,
        payload: { userId },
      });
      return {
        assignee: {
          id: c.user.id,
          email: c.user.email,
          displayName: c.user.displayName,
          avatarUrl: (c.user as any).avatarUrl ?? undefined,
        },
      };
    } catch (e: any) {
      // Unique violation => already assigned
      if (e?.code === "P2002") return { ok: true };
      throw e;
    }
  }

  async unassignSelf(userId: string, cardId: string) {
    const { card } = await this.assertCardAndMembership(userId, cardId);

    // Idempotent
    try {
      await assigneesRepo.unassign(cardId, userId);
      await activitiesRepo.createSafe({
        actorId: userId,
        workspaceId: card.list.board.workspaceId,
        boardId: card.list.board.id,
        cardId: card.id,
        type: activity_type.ASSIGNEE_REMOVED,
        payload: { userId },
      });
    } catch (e: any) {
      if (e?.code !== "P2025") throw e;
    }

    return { ok: true };
  }

  async addByAdmin(actorId: string, cardId: string, targetUserId: string) {
    const { card, boardMember } = await this.assertCardAndMembership(actorId, cardId);

    if (boardMember.role !== "OWNER" && boardMember.role !== "ADMIN") {
      throw new ApiError(403, "BOARD_FORBIDDEN", "Only board OWNER/ADMIN can assign others");
    }

    // Ensure target is board member
    const targetBoardMember = await boardsRepo.isBoardMember(card.list.board.id, targetUserId);
    if (!targetBoardMember) throw new ApiError(400, "ASSIGNEE_INVALID", "Target user is not a board member");

    try {
      const created = await assigneesRepo.assign(cardId, targetUserId);
      const c: any = created as any;
      await activitiesRepo.createSafe({
        actorId,
        workspaceId: card.list.board.workspaceId,
        boardId: card.list.board.id,
        cardId: card.id,
        type: activity_type.ASSIGNEE_ADDED,
        payload: { userId: targetUserId },
      });
      return {
        assignee: {
          id: c.user.id,
          email: c.user.email,
          displayName: c.user.displayName,
          avatarUrl: (c.user as any).avatarUrl ?? undefined,
        },
      };
    } catch (e: any) {
      if (e?.code === "P2002") return { ok: true };
      throw e;
    }
  }

  async kickByAdmin(actorId: string, cardId: string, targetUserId: string) {
    const { card, boardMember } = await this.assertCardAndMembership(actorId, cardId);

    if (boardMember.role !== "OWNER" && boardMember.role !== "ADMIN") {
      throw new ApiError(403, "BOARD_FORBIDDEN", "Only board OWNER/ADMIN can remove others");
    }

    // If user isn't assigned, treat as ok
    try {
      await assigneesRepo.unassign(cardId, targetUserId);
      await activitiesRepo.createSafe({
        actorId,
        workspaceId: card.list.board.workspaceId,
        boardId: card.list.board.id,
        cardId: card.id,
        type: activity_type.ASSIGNEE_REMOVED,
        payload: { userId: targetUserId },
      });
    } catch (e: any) {
      if (e?.code !== "P2025") throw e;
    }

    return { ok: true };
  }
}

export const assigneesService = new AssigneesService();
