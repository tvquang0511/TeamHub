import { z } from "zod";
import { Prisma } from "@prisma/client";

import { ApiError } from "../../common/errors/ApiError";
import { boardsRepo } from "../boards/boards.repo";
import { cardsRepo } from "../cards/cards.repo";
import { checklistsRepo } from "./checklists.repo";

const createChecklistInputSchema = z.object({
  title: z.string().min(1).max(200),
});

const updateChecklistInputSchema = z.object({
  title: z.string().min(1).max(200).optional(),
});

const createItemInputSchema = z.object({
  title: z.string().min(1).max(200),
});

const updateItemInputSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  isDone: z.boolean().optional(),
});

export class ChecklistsService {
  private async assertCanWriteCard(userId: string, cardId: string) {
    const card = await cardsRepo.findCardWorkspaceAndBoard(cardId);
    if (!card || card.archivedAt || card.list.archivedAt || card.list.board.archivedAt) {
      throw new ApiError(404, "CARD_NOT_FOUND", "Card not found");
    }

    const wsMembership = await boardsRepo.isWorkspaceMember(card.list.board.workspaceId, userId);
    if (!wsMembership) throw new ApiError(403, "WORKSPACE_FORBIDDEN", "You are not a member of this workspace");

    const boardMember = await boardsRepo.isBoardMember(card.list.board.id, userId);
    if (!boardMember) throw new ApiError(403, "BOARD_FORBIDDEN", "Board is read-only for non-members");

    return card;
  }

  async listByCard(userId: string, cardId: string) {
    await this.assertCanWriteCard(userId, cardId);
    const checklists = await checklistsRepo.listByCard(cardId);
    return { checklists };
  }

  async createChecklist(userId: string, cardId: string, input: unknown) {
    await this.assertCanWriteCard(userId, cardId);
    const data = createChecklistInputSchema.parse(input);

    // Put at end by default
    const existing = await checklistsRepo.listByCard(cardId);
    const last = existing[existing.length - 1];
    const nextPos = last ? (last.position as any) : new Prisma.Decimal(0);
    const position = last ? new Prisma.Decimal(nextPos).add(1) : new Prisma.Decimal(0);

    const checklist = await checklistsRepo.createChecklist({
      cardId,
      title: data.title,
      position,
    });

    return { checklist };
  }

  async updateChecklist(userId: string, checklistId: string, input: unknown) {
    // Permission: infer cardId via checklist
    const existing = await (checklistsRepo as any).listByCard; // no-op to keep service simple
    void existing;

    const data = updateChecklistInputSchema.parse(input);

    // We need checklist to assert permissions
    const checklist = await (checklistsRepo as any).findChecklist?.(checklistId);
    if (!checklist) {
      // fallback: fetch via prisma directly (repo doesn't expose helper)
      const row = await (require("../../db/prisma").default as any).checklists.findUnique({ where: { id: checklistId } });
      if (!row) throw new ApiError(404, "CHECKLIST_NOT_FOUND", "Checklist not found");
      await this.assertCanWriteCard(userId, row.cardId);
    } else {
      await this.assertCanWriteCard(userId, checklist.cardId);
    }

    const updated = await checklistsRepo.updateChecklist(checklistId, {
      title: data.title,
    });
    return { checklist: updated };
  }

  async deleteChecklist(userId: string, checklistId: string) {
    const row = await (require("../../db/prisma").default as any).checklists.findUnique({ where: { id: checklistId } });
    if (!row) throw new ApiError(404, "CHECKLIST_NOT_FOUND", "Checklist not found");
    await this.assertCanWriteCard(userId, row.cardId);

    await checklistsRepo.deleteChecklist(checklistId);
    return { ok: true };
  }

  async createItem(userId: string, checklistId: string, input: unknown) {
    const row = await (require("../../db/prisma").default as any).checklists.findUnique({ where: { id: checklistId } });
    if (!row) throw new ApiError(404, "CHECKLIST_NOT_FOUND", "Checklist not found");
    await this.assertCanWriteCard(userId, row.cardId);

    const data = createItemInputSchema.parse(input);

    const items = await (require("../../db/prisma").default as any).checklist_items.findMany({
      where: { checklistId },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      select: { position: true },
    });
    const last = items[items.length - 1];
    const position = last ? new Prisma.Decimal(last.position).add(1) : new Prisma.Decimal(0);

    const item = await checklistsRepo.createItem({ checklistId, title: data.title, position });
    return { item };
  }

  async updateItem(userId: string, itemId: string, input: unknown) {
    const item = await (require("../../db/prisma").default as any).checklist_items.findUnique({ where: { id: itemId } });
    if (!item) throw new ApiError(404, "CHECKLIST_ITEM_NOT_FOUND", "Checklist item not found");

    const checklist = await (require("../../db/prisma").default as any).checklists.findUnique({ where: { id: item.checklistId } });
    if (!checklist) throw new ApiError(404, "CHECKLIST_NOT_FOUND", "Checklist not found");
    await this.assertCanWriteCard(userId, checklist.cardId);

    const data = updateItemInputSchema.parse(input);
    const updated = await checklistsRepo.updateItem(itemId, {
      title: data.title,
      isDone: data.isDone,
    });
    return { item: updated };
  }

  async deleteItem(userId: string, itemId: string) {
    const item = await (require("../../db/prisma").default as any).checklist_items.findUnique({ where: { id: itemId } });
    if (!item) throw new ApiError(404, "CHECKLIST_ITEM_NOT_FOUND", "Checklist item not found");

    const checklist = await (require("../../db/prisma").default as any).checklists.findUnique({ where: { id: item.checklistId } });
    if (!checklist) throw new ApiError(404, "CHECKLIST_NOT_FOUND", "Checklist not found");
    await this.assertCanWriteCard(userId, checklist.cardId);

    await checklistsRepo.deleteItem(itemId);
    return { ok: true };
  }
}

export const checklistsService = new ChecklistsService();
export const checklistsSchemas = {
  createChecklistInputSchema,
  updateChecklistInputSchema,
  createItemInputSchema,
  updateItemInputSchema,
};
