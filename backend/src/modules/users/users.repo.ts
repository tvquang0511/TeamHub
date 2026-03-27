import prisma from '../../db/prisma';

export const usersRepo = {
  getById(userId: string) {
    return prisma.users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        description: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  },

  updateProfile(userId: string, data: { displayName?: string; description?: string | null; avatarUrl?: string | null }) {
    return prisma.users.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        description: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  },

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
