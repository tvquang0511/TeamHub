import { z } from "zod";

import { ApiError } from "../../common/errors/ApiError";
import { labelsRepo } from "./labels.repo";

export const createLabelInputSchema = z.object({
  boardId: z.string().uuid(),
  name: z.string().min(1).max(80),
  color: z.string().max(30).nullable().optional(),
});

export const updateLabelInputSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  color: z.string().max(30).nullable().optional(),
});

export class LabelsService {
  async list(userId: string, boardId: string) {
    if (!boardId) throw new ApiError(400, "BOARD_INVALID", "boardId is required");

    const membership = await labelsRepo.findBoardMember(boardId, userId);
    if (!membership) {
      throw new ApiError(403, "BOARD_FORBIDDEN", "You are not a member of this board");
    }

    const labels = await labelsRepo.listByBoard(boardId);
    return { labels };
  }

  async create(userId: string, input: z.infer<typeof createLabelInputSchema>) {
    const membership = await labelsRepo.findBoardMember(input.boardId, userId);
    if (!membership) {
      throw new ApiError(403, "BOARD_FORBIDDEN", "You are not a member of this board");
    }

    // Policy choice: only board OWNER/ADMIN can create/edit/delete labels.
    if (membership.role !== "OWNER" && membership.role !== "ADMIN") {
      throw new ApiError(403, "BOARD_FORBIDDEN", "Insufficient board role to manage labels");
    }

    const label = await labelsRepo.create(input.boardId, {
      name: input.name,
      color: input.color ?? null,
    });

    return { label };
  }

  async update(userId: string, labelId: string, input: z.infer<typeof updateLabelInputSchema>) {
    const existing = await labelsRepo.findById(labelId);
    if (!existing) throw new ApiError(404, "LABEL_NOT_FOUND", "Label not found");

    const membership = await labelsRepo.findBoardMember(existing.boardId, userId);
    if (!membership) {
      throw new ApiError(403, "BOARD_FORBIDDEN", "You are not a member of this board");
    }
    if (membership.role !== "OWNER" && membership.role !== "ADMIN") {
      throw new ApiError(403, "BOARD_FORBIDDEN", "Insufficient board role to manage labels");
    }

    const label = await labelsRepo.update(labelId, {
      name: input.name,
      color: input.color === undefined ? undefined : input.color,
    });

    return { label };
  }

  async delete(userId: string, labelId: string) {
    const existing = await labelsRepo.findById(labelId);
    if (!existing) throw new ApiError(404, "LABEL_NOT_FOUND", "Label not found");

    const membership = await labelsRepo.findBoardMember(existing.boardId, userId);
    if (!membership) {
      throw new ApiError(403, "BOARD_FORBIDDEN", "You are not a member of this board");
    }
    if (membership.role !== "OWNER" && membership.role !== "ADMIN") {
      throw new ApiError(403, "BOARD_FORBIDDEN", "Insufficient board role to manage labels");
    }

    await labelsRepo.delete(labelId);
    return { ok: true };
  }
}

export const labelsService = new LabelsService();
