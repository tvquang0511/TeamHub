import { notificationsRepo, type CreateNotificationInput } from "./notifications.repo";
import { getSocketServer } from "../../realtime/socket";

export const notificationsService = {
  async listUserNotifications(userId: string, page = 1, limit = 20) {
    return notificationsRepo.listByUser(userId, page, limit);
  },

  async markAsRead(id: string, userId: string) {
    await notificationsRepo.markAsRead(id, userId);
    return { ok: true };
  },

  async markAllAsRead(userId: string) {
    await notificationsRepo.markAllAsRead(userId);
    return { ok: true };
  },

  async deleteNotification(id: string, userId: string) {
    await notificationsRepo.delete(id, userId);
    return { ok: true };
  },

  /**
   * Helper function to create notification in DB and push realtime via Socket.IO
   */
  async createAndPushNotification(input: CreateNotificationInput) {
    // 1. Create in DB
    const notification = await notificationsRepo.create(input);

    // 2. Realtime Push via Socket.IO
    try {
      const io = getSocketServer();
      if (io) {
        io.to(`user:${input.userId}`).emit("notification:new", notification);
      }
    } catch (err) {
      console.error("[Notification] Realtime push failed:", err);
    }

    return notification;
  },
};
