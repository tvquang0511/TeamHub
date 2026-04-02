import { z } from 'zod';
import { ApiError } from '../../common/errors/ApiError';
import { workspacesRepo } from './workspaces.repo';
import { workspace_member_role } from '@prisma/client';
import env from '../../config/env';
import { presignPutObject } from '../../common/minio/minio.presign.put';
import { enqueueDeleteObject } from '../../integrations/queue/blobs.queue';

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
    const ws = await workspacesRepo.updateWorkspace(workspaceId, input);
    return { workspace: publicWorkspace(ws) };
  },

  async deleteWorkspace(actorId: string, workspaceId: string) {
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

    if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(contentType)) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Unsupported background content type');
    }

    const endpoint = env.MINIO_ENDPOINT;
    const accessKeyId = env.MINIO_ACCESS_KEY;
    const secretAccessKey = env.MINIO_SECRET_KEY;
    const region = env.MINIO_REGION;
    const bucket = env.MINIO_BUCKET_PUBLIC;

    // Fixed key per workspace to prevent accumulating old backgrounds.
    const objectKey = `workspace-backgrounds/${workspaceId}`;

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

    const expectedKey = `workspace-backgrounds/${workspaceId}`;
    if (objectKey !== expectedKey) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid workspace background objectKey');
    }

    const bucket = env.MINIO_BUCKET_PUBLIC;
    const endpoint = env.MINIO_ENDPOINT;

    const baseUrl = new URL(endpoint);
    const encodedPath = ['/', encodeURIComponent(bucket), '/', objectKey
      .split('/')
      .map(encodeURIComponent)
      .join('/')
    ].join('');
    const backgroundImageUrlBase = new URL(encodedPath, baseUrl).toString();
    const backgroundImageUrl = `${backgroundImageUrlBase}?v=${Date.now()}`;

    const existing = await workspacesRepo.getWorkspaceById(workspaceId);
    const ws = await workspacesRepo.updateWorkspace(workspaceId, { backgroundImageUrl });

    // Best-effort cleanup of legacy timestamped background keys.
    const prevUrl = existing?.backgroundImageUrl;
    if (prevUrl) {
      try {
        const u = new URL(prevUrl);
        const prevUrlBase = new URL(u.pathname, u.origin).toString();
        if (prevUrlBase !== backgroundImageUrlBase) {
          const parts = u.pathname.split('/').filter(Boolean).map(decodeURIComponent);
          const prevBucket = parts[0];
          const prevObjectKey = parts.slice(1).join('/');
          if (
            prevBucket &&
            prevObjectKey &&
            prevObjectKey.startsWith(`workspace-backgrounds/${workspaceId}/`)
          ) {
            await enqueueDeleteObject({ bucket: prevBucket, objectKey: prevObjectKey });
          }
        }
      } catch {
        // ignore
      }
    }

    // Also delete fixed key when background is later cleared (if you add such endpoint).
    return { workspace: publicWorkspace(ws) };
  },
};
