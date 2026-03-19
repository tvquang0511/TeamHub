import prisma from '../../db/prisma';

export const invitesRepo = {
  findWorkspaceInviteByToken(token: string) {
    return prisma.workspace_invites.findUnique({
      where: { token },
      include: { workspace: true },
    });
  },

  markWorkspaceInviteAccepted(id: string) {
    return prisma.workspace_invites.update({
      where: { id },
      data: { acceptedAt: new Date() },
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

  createMember(data: { workspaceId: string; userId: string; role: 'OWNER' | 'ADMIN' | 'MEMBER' }) {
    return prisma.workspace_members.create({
      data: {
        workspaceId: data.workspaceId,
        userId: data.userId,
        role: data.role as any,
      },
    });
  },

  findUserById(userId: string) {
    return prisma.users.findUnique({ where: { id: userId } });
  },
};
