import { z } from 'zod';
import { usersRepo } from './users.repo';
import { ApiError } from '../../common/errors/ApiError';
import { presignPutObject } from '../../common/minio/minio.presign.put';
import env from '../../config/env';

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

  const endpoint = env.MINIO_ENDPOINT;
  const accessKeyId = env.MINIO_ACCESS_KEY;
  const secretAccessKey = env.MINIO_SECRET_KEY;
  const region = env.MINIO_REGION;
  // Use a dedicated public bucket for avatars
  const bucket = env.MINIO_BUCKET_PUBLIC || env.MINIO_BUCKET;

    const ext = fileName.includes('.') ? fileName.split('.').pop()!.toLowerCase() : 'png';
    const safeExt = ext.replace(/[^a-z0-9]/g, '').slice(0, 10) || 'png';

    const objectKey = `avatars/${userId}/${Date.now()}.${safeExt}`;
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
    const endpoint = env.MINIO_ENDPOINT;

    // Build a public path-style URL pointing directly to the avatar in the public bucket.
    const baseUrl = new URL(endpoint);
    const encodedPath = ['/', encodeURIComponent(bucket), '/', objectKey
      .split('/')
      .map(encodeURIComponent)
      .join('/')
    ].join('');
    const avatarUrl = new URL(encodedPath, baseUrl).toString();

    const updated = await usersRepo.updateProfile(userId, { avatarUrl });

    return { user: updated };
  },
};
