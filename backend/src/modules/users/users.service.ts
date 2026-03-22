import { z } from 'zod';
import { usersRepo } from './users.repo';

export const usersSearchQuerySchema = z.object({
  q: z.string().min(1).max(200),
  // NOTE: kept for backward compatibility with older clients; ignored by the service.
  workspaceId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

export const usersService = {
  async search(userId: string, rawQuery: unknown) {
    const { q, limit } = usersSearchQuerySchema.parse(rawQuery);

    // Global search only: search by email/displayName keyword.
    // Workspace membership concerns are handled by workspace APIs (add/remove/list members),
    // not by user search.
    const users = await usersRepo.searchByEmailPrefix(q, limit ?? 10, userId);
    return { users };
  },
};
