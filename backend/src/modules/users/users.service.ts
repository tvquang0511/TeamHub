import { z } from 'zod';
import { usersRepo } from './users.repo';
import { ApiError } from '../../common/errors/ApiError';
import { presignPutObject } from '../../common/minio/minio.presign.put';
import env from '../../config/env';
import { enqueueDeleteObject } from '../../integrations/queue/blobs.queue';

export const usersSearchQuerySchema = z.object({
  q: z.string().min(1).max(200),
  // NOTE: kept for backward compatibility with older clients; ignored by the service.
  workspaceId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

const updateMeBodySchema = z.object({
  displayName: z.string().trim().min(1).max(100).optional(),
  description: z.string().trim().max(2000).optional().nullable(),
});

const avatarInitBodySchema = z.object({
  fileName: z.string().min(1).max(500),
  contentType: z.string().min(1).max(200),
});

const avatarCommitBodySchema = z.object({
  objectKey: z.string().min(1).max(2000),
});

export const usersService = {
  async getMe(userId: string) {
    const user = await usersRepo.getById(userId);
    if (!user) throw new ApiError(404, 'NOT_FOUND', 'User not found');
    return { user };
  },

  async updateMe(userId: string, rawBody: unknown) {
    const body = updateMeBodySchema.parse(rawBody);
    const updated = await usersRepo.updateProfile(userId, {
      ...(body.displayName !== undefined ? { displayName: body.displayName } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
    });
    return { user: updated };
  },

  async search(userId: string, rawQuery: unknown) {
    const { q, limit } = usersSearchQuerySchema.parse(rawQuery);

    // Global search only: search by email/displayName keyword.
    // Workspace membership concerns are handled by workspace APIs (add/remove/list members),
    // not by user search.
    const users = await usersRepo.searchByEmailPrefix(q, limit ?? 10, userId);
    return { users };
  },

  async initAvatarUpload(userId: string, rawBody: unknown) {
    const { fileName, contentType } = avatarInitBodySchema.parse(rawBody);

    // naive content-type allowlist
    if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(contentType)) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Unsupported avatar content type');
    }

    const endpoint = env.MINIO_PUBLIC_ENDPOINT ?? env.MINIO_ENDPOINT;
    const accessKeyId = env.MINIO_ACCESS_KEY;
    const secretAccessKey = env.MINIO_SECRET_KEY;
    const region = env.MINIO_REGION;
    // Use a dedicated public bucket for avatars
    const bucket = env.MINIO_BUCKET_PUBLIC || env.MINIO_BUCKET;

    // Fixed key per user to prevent accumulating old avatars.
    // (Content-Type is stored on the object at upload time.)
    const objectKey = `avatars/${userId}`;
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

    return {
      upload: presigned,
    };
  },

  async commitAvatarUpload(userId: string, rawBody: unknown) {
    const { objectKey } = avatarCommitBodySchema.parse(rawBody);
    const bucket = env.MINIO_BUCKET_PUBLIC || env.MINIO_BUCKET;
    const endpoint = env.MINIO_PUBLIC_ENDPOINT ?? env.MINIO_ENDPOINT;

    const expectedKey = `avatars/${userId}`;
    if (objectKey !== expectedKey) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid avatar objectKey');
    }

    // Build a public path-style URL pointing directly to the avatar in the public bucket.
    const baseUrl = new URL(endpoint);
    const encodedPath = ['/', encodeURIComponent(bucket), '/', objectKey
      .split('/')
      .map(encodeURIComponent)
      .join('/')
    ].join('');
    const avatarUrlBase = new URL(encodedPath, baseUrl).toString();

    // Cache busting: keep a stable key but change URL so browsers re-fetch.
    const avatarUrl = `${avatarUrlBase}?v=${Date.now()}`;

    const existing = await usersRepo.getById(userId);
    const updated = await usersRepo.updateProfile(userId, { avatarUrl });

    // Best-effort cleanup: if previous avatar used legacy timestamped key,
    // enqueue deletion to avoid leaving orphaned objects.
    const prevUrl = existing?.avatarUrl;
    if (prevUrl) {
      try {
        const u = new URL(prevUrl);
        const prevUrlBase = new URL(u.pathname, u.origin).toString();
        if (prevUrlBase === avatarUrlBase) return { user: updated };

        const parts = u.pathname.split('/').filter(Boolean).map(decodeURIComponent);
        const prevBucket = parts[0];
        const prevObjectKey = parts.slice(1).join('/');
        if (prevBucket && prevObjectKey && prevObjectKey.startsWith(`avatars/${userId}/`)) {
          await enqueueDeleteObject({ bucket: prevBucket, objectKey: prevObjectKey });
        }
      } catch {
        // ignore
      }
    }

    return { user: updated };
  },

  async deleteAvatar(userId: string) {
    const existing = await usersRepo.getById(userId);
    if (!existing) throw new ApiError(404, 'NOT_FOUND', 'User not found');

    const prevUrl = existing.avatarUrl;
    const updated = await usersRepo.updateProfile(userId, { avatarUrl: null });

    // Delete fixed key (current design)
    const bucket = env.MINIO_BUCKET_PUBLIC || env.MINIO_BUCKET;
    await enqueueDeleteObject({ bucket, objectKey: `avatars/${userId}` });

    // Best-effort: delete legacy timestamped key (if any)
    if (prevUrl) {
      try {
        const u = new URL(prevUrl);
        const parts = u.pathname.split('/').filter(Boolean).map(decodeURIComponent);
        const prevBucket = parts[0];
        const prevObjectKey = parts.slice(1).join('/');
        if (prevBucket && prevObjectKey && prevObjectKey.startsWith(`avatars/${userId}/`)) {
          await enqueueDeleteObject({ bucket: prevBucket, objectKey: prevObjectKey });
        }
      } catch {
        // ignore
      }
    }

    return { user: updated };
  },
};
