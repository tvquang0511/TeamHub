import prisma from '../../db/prisma';

export const workspacesRepo = {
  createWorkspace(data: { name: string }) {
    return prisma.workspaces.create({ data });
  },

  createMember(data: { workspaceId: string; userId: string; role: 'OWNER' | 'ADMIN' | 'MEMBER' }) {
    return prisma.workspace_members.create({
      data: {
        workspaceId: data.workspaceId,
        userId: data.userId,
        role: data.role as any,
      },
    });
  },

  findMembership(workspaceId: string, userId: string) {
    return prisma.workspace_members.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
    });
  },

  listMyWorkspaces(userId: string) {
    return prisma.workspace_members.findMany({
      where: { userId },
      include: {
        workspace: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  getWorkspaceById(id: string) {
    return prisma.workspaces.findUnique({ where: { id } });
  },

  listMembers(workspaceId: string) {
    return prisma.workspace_members.findMany({
      where: { workspaceId },
      include: {
        user: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  },

  createInvite(data: { workspaceId: string; email: string; token: string; expiresAt: Date }) {
    return prisma.workspace_invites.create({
      data: {
        workspaceId: data.workspaceId,
        email: data.email,
        token: data.token,
        expiresAt: data.expiresAt,
      },
    });
  },
};
