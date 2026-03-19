import { z } from 'zod';
import { ApiError } from '../../common/errors/ApiError';
import { workspacesRepo } from './workspaces.repo';
import crypto from 'crypto';

export const createWorkspaceInputSchema = z.object({
  name: z.string().min(1).max(200),
});

export const createWorkspaceInviteInputSchema = z.object({
  email: z.string().email(),
  // optional; if not provided, default 7 days
  expiresAt: z.string().datetime().optional(),
});

function publicWorkspace(ws: { id: string; name: string }) {
  return { id: ws.id, name: ws.name };
}

export const workspacesService = {
  async createWorkspace(userId: string, input: { name: string }) {
    const ws = await workspacesRepo.createWorkspace({ name: input.name });
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
        id: r.workspace.id,
        name: r.workspace.name,
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

  async createInvite(
    userId: string,
    workspaceId: string,
    input: { email: string; expiresAt?: string },
  ) {
    const membership = await workspacesRepo.findMembership(workspaceId, userId);
    if (!membership) {
      throw new ApiError(403, 'WORKSPACE_FORBIDDEN', 'Not a workspace member');
    }

    if (membership.role !== 'OWNER' && membership.role !== 'ADMIN') {
      throw new ApiError(403, 'WORKSPACE_FORBIDDEN', 'Insufficient workspace role');
    }

    const expiresAt = input.expiresAt ? new Date(input.expiresAt) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    if (Number.isNaN(expiresAt.getTime()) || expiresAt <= new Date()) {
      throw new ApiError(400, 'WORKSPACE_INVITE_INVALID', 'Invalid expiresAt');
    }

    const token = crypto.randomBytes(24).toString('hex');
    const invite = await workspacesRepo.createInvite({
      workspaceId,
      email: input.email.toLowerCase(),
      token,
      expiresAt,
    });

    // MVP: return token so Postman can test (later: send email and hide token)
    return {
      invite: {
        id: invite.id,
        email: invite.email,
        token: invite.token,
        expiresAt: invite.expiresAt.toISOString(),
      },
    };
  },
};
