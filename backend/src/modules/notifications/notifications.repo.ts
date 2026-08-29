import prisma from "../../infrastructure/database/prisma";
import type { notification_type } from "@prisma/client";

export type CreateNotificationInput = {
  userId: string;
  actorId?: string;
  title: string;
  content: string;
  type?: notification_type;
  linkUrl?: string;
};

export const notificationsRepo = {
  async listByUser(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [items, total, unreadCount] = await Promise.all([
      prisma.notifications.findMany({
        where: { userId },
        include: {
          actor: {
            select: {
              id: true,
              displayName: true,
              email: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.notifications.count({ where: { userId } }),
      prisma.notifications.count({ where: { userId, isRead: false } }),
    ]);

    return {
      items,
      total,
      unreadCount,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  async markAsRead(id: string, userId: string) {
    return prisma.notifications.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
  },

  async markAllAsRead(userId: string) {
    return prisma.notifications.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  },

  async delete(id: string, userId: string) {
    return prisma.notifications.deleteMany({
      where: { id, userId },
    });
  },

  async create(data: CreateNotificationInput) {
    return prisma.notifications.create({
      data: {
        userId: data.userId,
        actorId: data.actorId,
        title: data.title,
        content: data.content,
        type: data.type ?? "GENERAL",
        linkUrl: data.linkUrl,
      },
      include: {
        actor: {
          select: {
            id: true,
            displayName: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });
  },
};
