import prisma from '../../db/prisma';

export const invitesRepo = {
  findBoardInviteByToken(token: string) {
    return prisma.board_invites.findUnique({
      where: { token },
      include: {
        board: {
          select: {
            id: true,
            name: true,
            workspaceId: true,
          },
        },
      },
    });
  },

  listBoardInvites(boardId: string) {
    return prisma.board_invites.findMany({
      where: { boardId },
      orderBy: { createdAt: 'desc' },
    });
  },

  createBoardInvite(data: { boardId: string; email: string; token: string; expiresAt: Date }) {
    return prisma.board_invites.create({
      data: {
        boardId: data.boardId,
        email: data.email,
        token: data.token,
        expiresAt: data.expiresAt,
      },
    });
  },

  findBoardInviteById(inviteId: string) {
    return prisma.board_invites.findUnique({ where: { id: inviteId } });
  },

  revokeBoardInvite(inviteId: string) {
    return prisma.board_invites.update({
      where: { id: inviteId },
      data: { acceptedAt: new Date() },
    });
  },

  markBoardInviteAccepted(id: string) {
    return prisma.board_invites.update({
      where: { id },
      data: { acceptedAt: new Date() },
    });
  },

  findBoardMember(boardId: string, userId: string) {
    return prisma.board_members.findUnique({
      where: {
        boardId_userId: {
          boardId,
          userId,
        },
      },
    });
  },

  createBoardMember(data: { boardId: string; userId: string; role: 'ADMIN' | 'MEMBER' }) {
    return prisma.board_members.create({
      data: {
        boardId: data.boardId,
        userId: data.userId,
        role: data.role as any,
      },
    });
  },

  findBoardById(boardId: string) {
    return prisma.boards.findUnique({
      where: { id: boardId },
      select: { id: true, name: true, workspaceId: true },
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
