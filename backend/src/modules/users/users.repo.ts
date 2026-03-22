import prisma from '../../db/prisma';

export const usersRepo = {
  searchByEmailPrefix(emailPrefix: string, limit = 10, excludeUserId?: string) {
    return prisma.users.findMany({
      where: {
        ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
        OR: [
          {
            email: {
              contains: emailPrefix.toLowerCase(),
              mode: 'insensitive',
            },
          },
          {
            displayName: {
              contains: emailPrefix,
              mode: 'insensitive',
            },
          },
        ],
      },
      select: { id: true, email: true, displayName: true },
      take: Math.min(Math.max(limit, 1), 50),
      orderBy: { email: 'asc' },
    });
  },

  searchWorkspaceMembersByEmailPrefix(
    workspaceId: string,
    emailPrefix: string,
    limit = 10,
    excludeUserId?: string,
  ) {
    return prisma.workspace_members.findMany({
      where: {
        workspaceId,
        ...(excludeUserId ? { userId: { not: excludeUserId } } : {}),
        user: {
          OR: [
            {
              email: {
                contains: emailPrefix.toLowerCase(),
                mode: 'insensitive',
              },
            },
            {
              displayName: {
                contains: emailPrefix,
                mode: 'insensitive',
              },
            },
          ],
        },
      },
      select: {
        user: { select: { id: true, email: true, displayName: true } },
        role: true,
      },
      take: Math.min(Math.max(limit, 1), 50),
      orderBy: { createdAt: 'asc' },
    });
  },
};
