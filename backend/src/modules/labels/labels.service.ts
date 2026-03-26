import { z } from "zod";

import { ApiError } from "../../common/errors/ApiError";
import { labelsRepo } from "./labels.repo";

export const createLabelInputSchema = z.object({
  workspaceId: z.string().uuid(),
  name: z.string().min(1).max(80),
  color: z.string().max(30).nullable().optional(),
});

export const updateLabelInputSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  color: z.string().max(30).nullable().optional(),
});

export class LabelsService {
  async list(userId: string, workspaceId: string) {
    if (!workspaceId) throw new ApiError(400, "WORKSPACE_INVALID", "workspaceId is required");

    const membership = await labelsRepo.isWorkspaceMember(workspaceId, userId);
    if (!membership) {
      throw new ApiError(403, "WORKSPACE_FORBIDDEN", "You are not a member of this workspace");
    }

    const labels = await labelsRepo.listByWorkspace(workspaceId);
    return { labels };
  }

  async create(userId: string, input: z.infer<typeof createLabelInputSchema>) {
    const membership = await labelsRepo.isWorkspaceMember(input.workspaceId, userId);
    if (!membership) {
      throw new ApiError(403, "WORKSPACE_FORBIDDEN", "You are not a member of this workspace");
    }

    // Policy choice: only workspace OWNER/ADMIN can create/edit/delete labels.
    if (membership.role !== "OWNER" && membership.role !== "ADMIN") {
      throw new ApiError(403, "WORKSPACE_FORBIDDEN", "Insufficient workspace role to manage labels");
    }

    const label = await labelsRepo.create(input.workspaceId, {
      name: input.name,
      color: input.color ?? null,
    });

    return { label };
  }

  async update(userId: string, labelId: string, input: z.infer<typeof updateLabelInputSchema>) {
    const existing = await labelsRepo.findById(labelId);
    if (!existing) throw new ApiError(404, "LABEL_NOT_FOUND", "Label not found");

    const membership = await labelsRepo.isWorkspaceMember(existing.workspaceId, userId);
    if (!membership) {
      throw new ApiError(403, "WORKSPACE_FORBIDDEN", "You are not a member of this workspace");
    }
    if (membership.role !== "OWNER" && membership.role !== "ADMIN") {
      throw new ApiError(403, "WORKSPACE_FORBIDDEN", "Insufficient workspace role to manage labels");
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

    const membership = await labelsRepo.isWorkspaceMember(existing.workspaceId, userId);
    if (!membership) {
      throw new ApiError(403, "WORKSPACE_FORBIDDEN", "You are not a member of this workspace");
    }
    if (membership.role !== "OWNER" && membership.role !== "ADMIN") {
      throw new ApiError(403, "WORKSPACE_FORBIDDEN", "Insufficient workspace role to manage labels");
    }

    await labelsRepo.delete(labelId);
    return { ok: true };
  }
}

export const labelsService = new LabelsService();
