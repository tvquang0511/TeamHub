import prisma from '../../db/prisma';

export const invitesRepo = {
  listMyPendingWorkspaceInvites(email: string) {
    return prisma.workspace_invites.findMany({
      where: {
        email: email.toLowerCase(),
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { workspace: true },
      orderBy: { createdAt: 'desc' },
    });
  },

  findWorkspaceInviteByIdForEmail(inviteId: string, email: string) {
    return prisma.workspace_invites.findFirst({
      where: {
        id: inviteId,
        email: email.toLowerCase(),
      },
      include: { workspace: true },
    });
  },

  findWorkspaceInviteByToken(token: string) {
    return prisma.workspace_invites.findUnique({
      where: { token },
      include: { workspace: true },
    });
  },

  listWorkspaceInvites(workspaceId: string) {
    return prisma.workspace_invites.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
    });
  },

  createWorkspaceInvite(data: { workspaceId: string; email: string; token: string; expiresAt: Date }) {
    return prisma.workspace_invites.create({
      data: {
        workspaceId: data.workspaceId,
        email: data.email,
        token: data.token,
        expiresAt: data.expiresAt,
      },
    });
  },

  findWorkspaceInviteById(inviteId: string) {
    return prisma.workspace_invites.findUnique({
      where: { id: inviteId },
    });
  },

  revokeWorkspaceInvite(inviteId: string) {
    // Soft revoke using acceptedAt sentinel; we don't want to leak token validity.
    return prisma.workspace_invites.update({
      where: { id: inviteId },
      data: { acceptedAt: new Date() },
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

  createWorkspaceMemberIfMissing(data: {
    workspaceId: string;
    userId: string;
    role: 'OWNER' | 'ADMIN' | 'MEMBER';
  }) {
    return prisma.workspace_members.upsert({
      where: {
        workspaceId_userId: {
          workspaceId: data.workspaceId,
          userId: data.userId,
        },
      },
      update: {},
      create: {
        workspaceId: data.workspaceId,
        userId: data.userId,
        role: data.role as any,
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
