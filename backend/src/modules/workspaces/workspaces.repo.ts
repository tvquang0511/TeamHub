import prisma from '../../db/prisma';
import { workspace_member_role } from '@prisma/client';

export const workspacesRepo = {
  async createWorkspace(data: { name: string; description?: string | null }) {
    try {
      return await prisma.workspaces.create({
        data: {
          name: data.name,
          description: data.description ?? null,
        } as any,
      });
    } catch (err: any) {
      // Backward-compatibility: database may not have been migrated yet.
      // Prisma throws P2022 (column not found) when schema has `description` but DB doesn't.
      if (err?.code === 'P2022' && String(err?.message || '').includes('description')) {
        return prisma.workspaces.create({ data: { name: data.name } as any });
      }
      throw err;
    }
  },

  updateWorkspace(
    id: string,
    data: { name?: string; description?: string | null; backgroundImageUrl?: string | null },
  ) {
    return prisma.workspaces.update({ where: { id }, data });
  },

  deleteWorkspace(id: string) {
    return prisma.workspaces.delete({ where: { id } });
  },

  createMember(data: { workspaceId: string; userId: string; role: workspace_member_role }) {
    return prisma.workspace_members.create({
      data: {
        workspaceId: data.workspaceId,
        userId: data.userId,
        role: data.role,
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

  updateMemberRole(workspaceId: string, userId: string, role: Extract<workspace_member_role, 'ADMIN' | 'MEMBER'>) {
    return prisma.workspace_members.update({
      where: { workspaceId_userId: { workspaceId, userId } },
      data: { role },
    });
  },

  removeMember(workspaceId: string, userId: string) {
    return prisma.workspace_members.delete({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
  },

  countOwners(workspaceId: string) {
    return prisma.workspace_members.count({
      where: { workspaceId, role: 'OWNER' },
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
