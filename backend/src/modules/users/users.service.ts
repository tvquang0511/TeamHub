import { z } from 'zod';
import { ApiError } from '../../common/errors/ApiError';
import { usersRepo } from './users.repo';
import prisma from '../../db/prisma';

export const usersSearchQuerySchema = z.object({
  q: z.string().min(1).max(200),
  workspaceId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

export const usersService = {
  async search(userId: string, rawQuery: unknown) {
    const { q, workspaceId, limit } = usersSearchQuerySchema.parse(rawQuery);

    // If workspaceId is passed, require the requester to be a member of that workspace
    if (workspaceId) {
      const membership = await prisma.workspace_members.findUnique({
        where: { workspaceId_userId: { workspaceId, userId } },
        select: { id: true },
      });
      if (!membership) throw new ApiError(403, 'WORKSPACE_FORBIDDEN', 'Not a workspace member');

      const rows = await usersRepo.searchWorkspaceMembersByEmailPrefix(workspaceId, q, limit ?? 10);
      return {
        users: rows.map((r) => ({ ...r.user, workspaceRole: r.role })),
      };
    }

    // Global search (email/displayName contains) - for MVP admin tooling; can restrict later.
    const users = await usersRepo.searchByEmailPrefix(q, limit ?? 10);
    return { users };
  },
};
