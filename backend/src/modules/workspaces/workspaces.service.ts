import { z } from 'zod';
import { ApiError } from '../../common/errors/ApiError';
import { workspacesRepo } from './workspaces.repo';
import { workspace_member_role } from '@prisma/client';

export const createWorkspaceInputSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
});

export const updateWorkspaceInputSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).nullable().optional(),
});

function publicWorkspace(ws: {
  id: string;
  name: string;
  description?: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: ws.id,
    name: ws.name,
    description: ws.description ?? null,
    createdAt: ws.createdAt,
    updatedAt: ws.updatedAt,
  };
}

export const workspacesService = {
  async createWorkspace(userId: string, input: { name: string; description?: string }) {
    const ws = await workspacesRepo.createWorkspace({
      name: input.name,
      description: input.description ?? null,
    });
    await workspacesRepo.createMember({
      workspaceId: ws.id,
      userId,
      role: 'OWNER',
    });

    return { workspace: publicWorkspace(ws) };
  },

  async listMyWorkspaces(userId: string) {
    const rows = await workspacesRepo.listMyWorkspaces(userId);
    return {
      workspaces: rows.map((r) => ({
        ...publicWorkspace(r.workspace),
        role: r.role,
      })),
    };
  },

  async getWorkspaceDetail(userId: string, workspaceId: string) {
    const membership = await workspacesRepo.findMembership(workspaceId, userId);
    if (!membership) {
      throw new ApiError(403, 'WORKSPACE_FORBIDDEN', 'Not a workspace member');
    }

    const ws = await workspacesRepo.getWorkspaceById(workspaceId);
    if (!ws) {
      throw new ApiError(404, 'WORKSPACE_NOT_FOUND', 'Workspace not found');
    }

    return { workspace: publicWorkspace(ws) };
  },

  async updateWorkspace(actorId: string, workspaceId: string, input: { name?: string; description?: string | null }) {
    const actor = await workspacesRepo.findMembership(workspaceId, actorId);
    if (!actor) throw new ApiError(403, 'WORKSPACE_FORBIDDEN', 'Not a workspace member');
    if (actor.role !== 'OWNER' && actor.role !== 'ADMIN') {
      throw new ApiError(403, 'WORKSPACE_FORBIDDEN', 'Insufficient workspace role');
    }

    const ws = await workspacesRepo.updateWorkspace(workspaceId, input);
    return { workspace: publicWorkspace(ws) };
  },

  async deleteWorkspace(actorId: string, workspaceId: string) {
    const actor = await workspacesRepo.findMembership(workspaceId, actorId);
    if (!actor) throw new ApiError(403, 'WORKSPACE_FORBIDDEN', 'Not a workspace member');
    if (actor.role !== 'OWNER') {
      throw new ApiError(403, 'WORKSPACE_FORBIDDEN', 'Only OWNER can delete workspace');
    }

    await workspacesRepo.deleteWorkspace(workspaceId);
    return { ok: true };
  },

  async listMembers(userId: string, workspaceId: string) {
    const membership = await workspacesRepo.findMembership(workspaceId, userId);
    if (!membership) {
      throw new ApiError(403, 'WORKSPACE_FORBIDDEN', 'Not a workspace member');
    }

    const members = await workspacesRepo.listMembers(workspaceId);
    return {
      members: members.map((m) => ({
        id: m.id,
        userId: m.userId,
        displayName: m.user.displayName,
        role: m.role,
      })),
    };
  },

  async updateMemberRole(
    actorId: string,
    workspaceId: string,
    targetUserId: string,
    role: Extract<workspace_member_role, 'ADMIN' | 'MEMBER'>,
  ) {
    const actor = await workspacesRepo.findMembership(workspaceId, actorId);
    if (!actor) throw new ApiError(403, 'WORKSPACE_FORBIDDEN', 'Not a workspace member');
    if (actor.role !== 'OWNER' && actor.role !== 'ADMIN') {
      throw new ApiError(403, 'WORKSPACE_FORBIDDEN', 'Insufficient workspace role');
    }

    const target = await workspacesRepo.findMembership(workspaceId, targetUserId);
    if (!target) throw new ApiError(404, 'WORKSPACE_MEMBER_NOT_FOUND', 'Member not found');

    // Keep OWNER immutable via this endpoint.
    if (target.role === 'OWNER') {
      throw new ApiError(400, 'WORKSPACE_MEMBER_INVALID', 'Cannot change OWNER role');
    }

    await workspacesRepo.updateMemberRole(workspaceId, targetUserId, role);
    return { ok: true };
  },

  async removeMember(actorId: string, workspaceId: string, targetUserId: string) {
    const actor = await workspacesRepo.findMembership(workspaceId, actorId);
    if (!actor) throw new ApiError(403, 'WORKSPACE_FORBIDDEN', 'Not a workspace member');
    if (actor.role !== 'OWNER' && actor.role !== 'ADMIN') {
      throw new ApiError(403, 'WORKSPACE_FORBIDDEN', 'Insufficient workspace role');
    }

    const target = await workspacesRepo.findMembership(workspaceId, targetUserId);
    if (!target) throw new ApiError(404, 'WORKSPACE_MEMBER_NOT_FOUND', 'Member not found');

    // Prevent removing the last OWNER.
    if (target.role === 'OWNER') {
      const ownerCount = await workspacesRepo.countOwners(workspaceId);
      if (ownerCount <= 1) throw new ApiError(400, 'WORKSPACE_OWNER_REQUIRED', 'Workspace must have at least one OWNER');
    }

    await workspacesRepo.removeMember(workspaceId, targetUserId);
    return { ok: true };
  },

  async leave(userId: string, workspaceId: string) {
    const membership = await workspacesRepo.findMembership(workspaceId, userId);
    if (!membership) throw new ApiError(403, 'WORKSPACE_FORBIDDEN', 'Not a workspace member');

    if (membership.role === 'OWNER') {
      const ownerCount = await workspacesRepo.countOwners(workspaceId);
      if (ownerCount <= 1) throw new ApiError(400, 'WORKSPACE_OWNER_REQUIRED', 'Workspace must have at least one OWNER');
    }

    await workspacesRepo.removeMember(workspaceId, userId);
    return { ok: true };
  },
};
