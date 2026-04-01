import { Prisma, activity_type } from "@prisma/client";
import { z } from "zod";

import { ApiError } from "../../common/errors/ApiError";
import { computeBetweenPosition } from "../../common/utils/position";
import env from "../../config/env";
import {
  bumpBoardCacheVersion,
  cacheDel,
  cacheGetJson,
  cacheKey,
  cacheSetJson,
} from "../../integrations/cache/redisCache";
import { enqueueReminderJob, removeReminderJob } from "../../integrations/queue/reminders.queue";
import { activitiesRepo } from "../activities/activities.repo";
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
  isDone: z.boolean().optional(),
  position: z.number().nullable().optional(),
  archived: z.boolean().optional(),
  // allow moving card to another list (within same workspace)
  listId: z.string().uuid().optional(),
});

export class CardsService {
  private cardDetailCacheKey(cardId: string) {
    return cacheKey("card", cardId, "detail");
  }

  async create(userId: string, input: z.infer<typeof createCardInputSchema>) {
    const list = await cardsRepo.findList(input.listId);
    if (!list || list.archivedAt || list.board.archivedAt) {
      throw new ApiError(404, "LIST_NOT_FOUND", "List not found");
    }

    const membership = await cardsRepo.isWorkspaceMember(list.board.workspaceId, userId);
    if (!membership) throw new ApiError(403, "WORKSPACE_FORBIDDEN", "You are not a member of this workspace");

    const boardMember = await cardsRepo.isBoardMember(list.board.id, userId);
    if (!boardMember) {
      // WORKSPACE boards are readable by workspace members, but write operations require board membership.
      throw new ApiError(403, "BOARD_FORBIDDEN", "Board is read-only for non-members");
    }

    const dueAt = input.dueAt ? new Date(input.dueAt) : null;

    const card = await cardsRepo.create({
      listId: input.listId,
      title: input.title,
      description: input.description ?? null,
      dueAt,
      position: new Prisma.Decimal(input.position ?? Date.now()),
    });

    await activitiesRepo.createSafe({
      actorId: userId,
      workspaceId: list.board.workspaceId,
      boardId: list.board.id,
      cardId: card.id,
      type: activity_type.CARD_CREATED,
      payload: { listId: input.listId },
    });

    await bumpBoardCacheVersion(list.board.id);

    return { card };
  }

  async list(userId: string, listId: string) {
    const list = await cardsRepo.findList(listId);
    if (!list || list.archivedAt || list.board.archivedAt) {
      throw new ApiError(404, "LIST_NOT_FOUND", "List not found");
    }

    const membership = await cardsRepo.isWorkspaceMember(list.board.workspaceId, userId);
    if (!membership) throw new ApiError(403, "WORKSPACE_FORBIDDEN", "You are not a member of this workspace");

    if (list.board.visibility !== "WORKSPACE") {
      const boardMember = await cardsRepo.isBoardMember(list.board.id, userId);
      if (!boardMember) {
        // Option B: workspace OWNER/ADMIN can read PRIVATE boards in read-only mode.
        if (membership.role !== "OWNER" && membership.role !== "ADMIN") {
          throw new ApiError(404, "BOARD_NOT_FOUND", "Board not found");
        }
      }
    }

    const cards = await cardsRepo.listByList(listId);
    return { cards };
  }

  async get(userId: string, cardId: string) {
    const cacheKeyStr = this.cardDetailCacheKey(cardId);
    const cached = await cacheGetJson<any>(cacheKeyStr);

    const card = cached ?? (await cardsRepo.findById(cardId));
    if (!card) throw new ApiError(404, "CARD_NOT_FOUND", "Card not found");

    const workspaceId = card.list.board.workspaceId;
    const membership = await cardsRepo.isWorkspaceMember(workspaceId, userId);
    if (!membership) throw new ApiError(403, "WORKSPACE_FORBIDDEN", "You are not a member of this workspace");

    if (card.list.board.visibility !== "WORKSPACE") {
      const boardMember = await cardsRepo.isBoardMember(card.list.board.id, userId);
      if (!boardMember) {
        if (membership.role !== "OWNER" && membership.role !== "ADMIN") {
          throw new ApiError(404, "BOARD_NOT_FOUND", "Board not found");
        }
      }
    }

    // Cache after authz checks to avoid caching on invalid IDs that might throw.
    if (!cached) {
      await cacheSetJson(cacheKeyStr, card, env.CACHE_CARD_DETAIL_TTL_SEC);
    }

    return { card };
  }

  async update(userId: string, cardId: string, input: z.infer<typeof updateCardInputSchema>) {
    const existing = await cardsRepo.findById(cardId);
    if (!existing) throw new ApiError(404, "CARD_NOT_FOUND", "Card not found");

    const existingWorkspaceId = existing.list.board.workspaceId;
    const membership = await cardsRepo.isWorkspaceMember(existingWorkspaceId, userId);
    if (!membership) throw new ApiError(403, "WORKSPACE_FORBIDDEN", "You are not a member of this workspace");

    const boardMember = await cardsRepo.isBoardMember(existing.list.board.id, userId);
    if (!boardMember) {
      throw new ApiError(403, "BOARD_FORBIDDEN", "Board is read-only for non-members");
    }

    let nextListId: string | undefined = undefined;
    let nextBoardId: string | null = null;
    if (input.listId) {
      const nextList = await cardsRepo.findList(input.listId);
      if (!nextList || nextList.archivedAt || nextList.board.archivedAt) {
        throw new ApiError(404, "LIST_NOT_FOUND", "List not found");
      }
      if (nextList.board.workspaceId !== existingWorkspaceId) {
        throw new ApiError(400, "CARD_MOVE_INVALID", "Cannot move card to a different workspace");
      }

      // Must be a member of the destination board when moving.
      const nextBoardMember = await cardsRepo.isBoardMember(nextList.board.id, userId);
      if (!nextBoardMember) throw new ApiError(404, "BOARD_NOT_FOUND", "Board not found");
      nextListId = input.listId;
      nextBoardId = nextList.board.id;
    }

    const archivedAt = input.archived === undefined ? undefined : input.archived ? new Date() : null;
    const dueAt = input.dueAt === undefined ? undefined : input.dueAt === null ? null : new Date(input.dueAt);

    const isDone = input.isDone === undefined ? undefined : input.isDone;

    const card = await cardsRepo.update(cardId, {
      title: input.title,
      description: input.description ?? undefined,
      dueAt,
      isDone,
      position:
        input.position === undefined
          ? undefined
          : input.position === null
            ? null
            : new Prisma.Decimal(input.position),
      archivedAt,
      listId: nextListId,
    });

    if (nextListId && nextListId !== existing.listId) {
      await activitiesRepo.createSafe({
        actorId: userId,
        workspaceId: existing.list.board.workspaceId,
        boardId: existing.list.board.id,
        cardId: card.id,
        type: activity_type.CARD_MOVED,
        payload: { fromListId: existing.listId, toListId: nextListId },
      });
    }

    if (input.dueAt !== undefined) {
      const prev = existing.dueAt ? existing.dueAt.toISOString() : null;
      const next = dueAt ? dueAt.toISOString() : null;
      if (prev !== next) {
        await activitiesRepo.createSafe({
          actorId: userId,
          workspaceId: existing.list.board.workspaceId,
          boardId: existing.list.board.id,
          cardId: card.id,
          type: activity_type.DUE_AT_CHANGED,
          payload: { from: prev, to: next },
        });
      }
    }

    if (input.isDone !== undefined && existing.isDone !== input.isDone) {
      await activitiesRepo.createSafe({
        actorId: userId,
        workspaceId: existing.list.board.workspaceId,
        boardId: existing.list.board.id,
        cardId: card.id,
        type: activity_type.CARD_UPDATED,
        payload: { field: "isDone", from: existing.isDone, to: input.isDone },
      });
    }

    await cacheDel(this.cardDetailCacheKey(cardId));

    const sourceBoardId = existing.list.board.id;
    await bumpBoardCacheVersion(sourceBoardId);
    if (nextBoardId && nextBoardId !== sourceBoardId) {
      await bumpBoardCacheVersion(nextBoardId);
    }

    return { card };
  }

  async setDueDate(userId: string, cardId: string, input: { dueAt: string | null }) {
    return this.update(userId, cardId, { dueAt: input.dueAt });
  }

  async setDone(userId: string, cardId: string, input: { isDone: boolean }) {
    return this.update(userId, cardId, { isDone: input.isDone });
  }

  private async assertCanReadCard(userId: string, cardId: string) {
    const card = await cardsRepo.findCardWorkspaceAndBoard(cardId);
    if (!card || card.archivedAt || card.list.archivedAt || card.list.board.archivedAt) {
      throw new ApiError(404, "CARD_NOT_FOUND", "Card not found");
    }

    const workspaceId = card.list.board.workspaceId;
    const membership = await cardsRepo.isWorkspaceMember(workspaceId, userId);
    if (!membership) throw new ApiError(403, "WORKSPACE_FORBIDDEN", "You are not a member of this workspace");

    if (card.list.board.visibility !== "WORKSPACE") {
      const boardMember = await cardsRepo.isBoardMember(card.list.board.id, userId);
      if (!boardMember) {
        if (membership.role !== "OWNER" && membership.role !== "ADMIN") {
          throw new ApiError(404, "BOARD_NOT_FOUND", "Board not found");
        }
      }
    }
  }

  async listReminders(userId: string, cardId: string) {
    await this.assertCanReadCard(userId, cardId);
    const reminders = await cardsRepo.listReminderJobsForUser(cardId, userId);
    return { reminders };
  }

  async setReminder(userId: string, cardId: string, input: { remindAt: string }) {
    await this.assertCanReadCard(userId, cardId);

    const remindAt = new Date(input.remindAt);
    const reminder = await cardsRepo.upsertReminderJobForUser({ cardId, userId, remindAt });

    await enqueueReminderJob({ reminderJobId: reminder.id, remindAt: reminder.remindAt });

    return { reminder };
  }

  async cancelReminder(userId: string, cardId: string, reminderJobId: string) {
    await this.assertCanReadCard(userId, cardId);

    const exists = await cardsRepo.findReminderJobForUserById({ reminderJobId, cardId, userId });
    if (!exists) throw new ApiError(404, "REMINDER_NOT_FOUND", "Reminder not found");

    await cardsRepo.cancelReminderJobForUser({ reminderJobId, cardId, userId });
    await removeReminderJob(reminderJobId);

    return { ok: true };
  }

  async move(
    userId: string,
    cardId: string,
    input: { listId?: string; prevId?: string | null; nextId?: string | null },
  ) {
    const existing = await cardsRepo.findById(cardId);
    if (!existing) throw new ApiError(404, "CARD_NOT_FOUND", "Card not found");

    const existingWorkspaceId = existing.list.board.workspaceId;
    const membership = await cardsRepo.isWorkspaceMember(existingWorkspaceId, userId);
    if (!membership) throw new ApiError(403, "WORKSPACE_FORBIDDEN", "You are not a member of this workspace");

    // Must be member of the source board.
    const sourceBoardId = existing.list.board.id;
    const sourceBoardMember = await cardsRepo.isBoardMember(sourceBoardId, userId);
    if (!sourceBoardMember) {
      throw new ApiError(403, "BOARD_FORBIDDEN", "Board is read-only for non-members");
    }

    // Determine destination list/board
    const destinationListId = input.listId ?? existing.listId;
    const destinationList = await cardsRepo.findList(destinationListId);
    if (!destinationList || destinationList.archivedAt || destinationList.board.archivedAt) {
      throw new ApiError(404, "LIST_NOT_FOUND", "List not found");
    }
    if (destinationList.board.workspaceId !== existingWorkspaceId) {
      throw new ApiError(400, "CARD_MOVE_INVALID", "Cannot move card to a different workspace");
    }

    // Must be member of destination board.
    const destBoardMember = await cardsRepo.isBoardMember(destinationList.board.id, userId);
    if (!destBoardMember) {
      throw new ApiError(403, "BOARD_FORBIDDEN", "Board is read-only for non-members");
    }

    const prev = input.prevId ? await cardsRepo.findCardPosition(input.prevId) : null;
    const next = input.nextId ? await cardsRepo.findCardPosition(input.nextId) : null;

    if (prev && prev.listId !== destinationListId) {
      throw new ApiError(400, "CARD_MOVE_INVALID", "prevId must belong to the destination list");
    }
    if (next && next.listId !== destinationListId) {
      throw new ApiError(400, "CARD_MOVE_INVALID", "nextId must belong to the destination list");
    }

    const position = computeBetweenPosition(prev?.position, next?.position);
    const card = await cardsRepo.move(cardId, { listId: destinationListId, position });

    await activitiesRepo.createSafe({
      actorId: userId,
      workspaceId: existing.list.board.workspaceId,
      boardId: existing.list.board.id,
      cardId: card.id,
      type: activity_type.CARD_MOVED,
      payload: { fromListId: existing.listId, toListId: destinationListId },
    });

    await cacheDel(this.cardDetailCacheKey(cardId));

    const destBoardId = destinationList.board.id;
    await bumpBoardCacheVersion(sourceBoardId);
    if (destBoardId !== sourceBoardId) {
      await bumpBoardCacheVersion(destBoardId);
    }

    return { card };
  }

  async delete(userId: string, cardId: string) {
    const existing = await cardsRepo.findById(cardId);
    if (!existing) throw new ApiError(404, "CARD_NOT_FOUND", "Card not found");

    const workspaceId = existing.list.board.workspaceId;
    const membership = await cardsRepo.isWorkspaceMember(workspaceId, userId);
    if (!membership) throw new ApiError(403, "WORKSPACE_FORBIDDEN", "You are not a member of this workspace");

    const boardMember = await cardsRepo.isBoardMember(existing.list.board.id, userId);
    if (!boardMember) {
      throw new ApiError(403, "BOARD_FORBIDDEN", "Board is read-only for non-members");
    }

    await cardsRepo.update(cardId, { archivedAt: new Date() });

    await cacheDel(this.cardDetailCacheKey(cardId));
    await bumpBoardCacheVersion(existing.list.board.id);
    return { ok: true };
  }

  async listLabels(userId: string, cardId: string) {
    const card = await cardsRepo.findCardWorkspaceAndBoard(cardId);
    if (!card || card.archivedAt || card.list.archivedAt || card.list.board.archivedAt) {
      throw new ApiError(404, "CARD_NOT_FOUND", "Card not found");
    }

    const workspaceId = card.list.board.workspaceId;
    const membership = await cardsRepo.isWorkspaceMember(workspaceId, userId);
    if (!membership) throw new ApiError(403, "WORKSPACE_FORBIDDEN", "You are not a member of this workspace");

    if (card.list.board.visibility !== "WORKSPACE") {
      const boardMember = await cardsRepo.isBoardMember(card.list.board.id, userId);
      if (!boardMember) {
        if (membership.role !== "OWNER" && membership.role !== "ADMIN") {
          throw new ApiError(404, "BOARD_NOT_FOUND", "Board not found");
        }
      }
    }

    const cardLabels = await cardsRepo.listLabelsByCard(cardId);
    const labels = cardLabels.map((cl: any) => cl.label);
    return { labels };
  }

  async attachLabel(userId: string, cardId: string, labelId: string) {
    const card = await cardsRepo.findCardWorkspaceAndBoard(cardId);
    if (!card || card.archivedAt || card.list.archivedAt || card.list.board.archivedAt) {
      throw new ApiError(404, "CARD_NOT_FOUND", "Card not found");
    }

    const workspaceId = card.list.board.workspaceId;
    const membership = await cardsRepo.isWorkspaceMember(workspaceId, userId);
    if (!membership) throw new ApiError(403, "WORKSPACE_FORBIDDEN", "You are not a member of this workspace");

    // Must be board member to modify cards.
    const boardMember = await cardsRepo.isBoardMember(card.list.board.id, userId);
    if (!boardMember) throw new ApiError(403, "BOARD_FORBIDDEN", "Board is read-only for non-members");

    const label = await cardsRepo.findLabel(labelId);
    if (!label) throw new ApiError(404, "LABEL_NOT_FOUND", "Label not found");
    if (label.boardId !== card.list.board.id) {
      throw new ApiError(400, "LABEL_INVALID", "Label does not belong to the same board");
    }

    // Limit: each card can have at most 5 labels (Trello-like)
    const existing = await cardsRepo.listLabelsByCard(cardId);
    if ((existing || []).length >= 5) {
      throw new ApiError(400, "CARD_LABEL_LIMIT", "A card can have at most 5 labels");
    }

    try {
      const attached = await cardsRepo.attachLabel(cardId, labelId);
      await activitiesRepo.createSafe({
        actorId: userId,
        workspaceId: card.list.board.workspaceId,
        boardId: card.list.board.id,
        cardId: card.id,
        type: activity_type.LABEL_ADDED,
        payload: { labelId },
      });

      await cacheDel(this.cardDetailCacheKey(cardId));
      await bumpBoardCacheVersion(card.list.board.id);
      return { label: attached.label };
    } catch (e: any) {
      // Unique violation => already attached
      if (e?.code === "P2002") {
        return { ok: true };
      }
      throw e;
    }
  }

  async detachLabel(userId: string, cardId: string, labelId: string) {
    const card = await cardsRepo.findCardWorkspaceAndBoard(cardId);
    if (!card || card.archivedAt || card.list.archivedAt || card.list.board.archivedAt) {
      throw new ApiError(404, "CARD_NOT_FOUND", "Card not found");
    }

    const workspaceId = card.list.board.workspaceId;
    const membership = await cardsRepo.isWorkspaceMember(workspaceId, userId);
    if (!membership) throw new ApiError(403, "WORKSPACE_FORBIDDEN", "You are not a member of this workspace");

    const boardMember = await cardsRepo.isBoardMember(card.list.board.id, userId);
    if (!boardMember) throw new ApiError(403, "BOARD_FORBIDDEN", "Board is read-only for non-members");

    // Idempotent delete
    try {
      await cardsRepo.detachLabel(cardId, labelId);
      await activitiesRepo.createSafe({
        actorId: userId,
        workspaceId: card.list.board.workspaceId,
        boardId: card.list.board.id,
        cardId: card.id,
        type: activity_type.LABEL_REMOVED,
        payload: { labelId },
      });
    } catch (e: any) {
      if (e?.code !== "P2025") throw e;
    }

    await cacheDel(this.cardDetailCacheKey(cardId));
    await bumpBoardCacheVersion(card.list.board.id);

    return { ok: true };
  }
}

export const cardsService = new CardsService();
