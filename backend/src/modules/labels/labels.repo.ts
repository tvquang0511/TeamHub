import prisma from "../../db/prisma";

export const labelsRepo = {
  isWorkspaceMember: async (workspaceId: string, userId: string) => {
    return prisma.workspace_members.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
      select: { id: true, role: true },
    });
  },

  listByWorkspace: async (workspaceId: string) => {
    return prisma.labels.findMany({
      where: { workspaceId },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: {
        id: true,
        workspaceId: true,
        name: true,
        color: true,
        createdAt: true,
      },
    });
  },

  create: async (workspaceId: string, data: { name: string; color?: string | null }) => {
    return prisma.labels.create({
      data: {
        workspaceId,
        name: data.name,
        color: data.color ?? null,
      },
      select: {
        id: true,
        workspaceId: true,
        name: true,
        color: true,
        createdAt: true,
      },
    });
  },

  findById: async (labelId: string) => {
    return prisma.labels.findUnique({
      where: { id: labelId },
      select: {
        id: true,
        workspaceId: true,
        name: true,
        color: true,
        createdAt: true,
      },
    });
  },

  update: async (labelId: string, data: { name?: string; color?: string | null }) => {
    return prisma.labels.update({
      where: { id: labelId },
      data: {
        name: data.name,
        color: data.color === undefined ? undefined : data.color,
      },
      select: {
        id: true,
        workspaceId: true,
        name: true,
        color: true,
        createdAt: true,
      },
    });
  },

  delete: async (labelId: string) => {
    // Because card_labels has onDelete cascade on label, this will remove mappings too.
    return prisma.labels.delete({ where: { id: labelId } });
  },
};
