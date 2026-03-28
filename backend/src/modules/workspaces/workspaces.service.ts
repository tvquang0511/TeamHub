import { z } from 'zod';
import { ApiError } from '../../common/errors/ApiError';
import { workspacesRepo } from './workspaces.repo';
import { workspace_member_role } from '@prisma/client';
import env from '../../config/env';
import { presignPutObject } from '../../common/minio/minio.presign.put';

export const createWorkspaceInputSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
});

export const updateWorkspaceInputSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).nullable().optional(),
});

const workspaceBgInitBodySchema = z.object({
  fileName: z.string().min(1).max(500),
  contentType: z.string().min(1).max(200),
});

const workspaceBgCommitBodySchema = z.object({
  objectKey: z.string().min(1).max(2000),
});

function publicWorkspace(ws: {
  id: string;
  name: string;
  description?: string | null;
  backgroundImageUrl?: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: ws.id,
    name: ws.name,
    description: ws.description ?? null,
    backgroundImageUrl: ws.backgroundImageUrl ?? null,
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
        email: m.user.email,
        displayName: m.user.displayName,
        avatarUrl: m.user.avatarUrl ?? null,
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

  async initBackgroundUpload(actorId: string, workspaceId: string, rawBody: unknown) {
    const { fileName, contentType } = workspaceBgInitBodySchema.parse(rawBody);

    const actor = await workspacesRepo.findMembership(workspaceId, actorId);
    if (!actor) throw new ApiError(403, 'WORKSPACE_FORBIDDEN', 'Not a workspace member');
    if (actor.role !== 'OWNER' && actor.role !== 'ADMIN') {
      throw new ApiError(403, 'WORKSPACE_FORBIDDEN', 'Insufficient workspace role');
    }

    if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(contentType)) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Unsupported background content type');
    }

    const endpoint = env.MINIO_ENDPOINT;
    const accessKeyId = env.MINIO_ACCESS_KEY;
    const secretAccessKey = env.MINIO_SECRET_KEY;
    const region = env.MINIO_REGION;
    const bucket = env.MINIO_BUCKET_PUBLIC;

    const ext = fileName.includes('.') ? fileName.split('.').pop()!.toLowerCase() : 'jpg';
    const safeExt = ext.replace(/[^a-z0-9]/g, '').slice(0, 10) || 'jpg';
    const objectKey = `workspace-backgrounds/${workspaceId}/${Date.now()}.${safeExt}`;

    const presigned = presignPutObject({
      endpoint,
      accessKeyId,
      secretAccessKey,
      region,
      bucket,
      objectKey,
      contentType,
      expiresInSeconds: 300,
    });

    return { upload: presigned };
  },

  async commitBackgroundUpload(actorId: string, workspaceId: string, rawBody: unknown) {
    const { objectKey } = workspaceBgCommitBodySchema.parse(rawBody);

    if (!objectKey.startsWith(`workspace-backgrounds/${workspaceId}/`)) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid workspace background objectKey');
    }

    const actor = await workspacesRepo.findMembership(workspaceId, actorId);
    if (!actor) throw new ApiError(403, 'WORKSPACE_FORBIDDEN', 'Not a workspace member');
    if (actor.role !== 'OWNER' && actor.role !== 'ADMIN') {
      throw new ApiError(403, 'WORKSPACE_FORBIDDEN', 'Insufficient workspace role');
    }

    const bucket = env.MINIO_BUCKET_PUBLIC;
    const endpoint = env.MINIO_ENDPOINT;

    const baseUrl = new URL(endpoint);
    const encodedPath = ['/', encodeURIComponent(bucket), '/', objectKey
      .split('/')
      .map(encodeURIComponent)
      .join('/')
    ].join('');
    const backgroundImageUrl = new URL(encodedPath, baseUrl).toString();

    const ws = await workspacesRepo.updateWorkspace(workspaceId, { backgroundImageUrl });
    return { workspace: publicWorkspace(ws) };
  },
};
