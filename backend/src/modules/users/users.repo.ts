import prisma from '../../db/prisma';

export const usersRepo = {
  searchByEmailPrefix(emailPrefix: string, limit = 10) {
    return prisma.users.findMany({
      where: {
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

  searchWorkspaceMembersByEmailPrefix(workspaceId: string, emailPrefix: string, limit = 10) {
    return prisma.workspace_members.findMany({
      where: {
        workspaceId,
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
