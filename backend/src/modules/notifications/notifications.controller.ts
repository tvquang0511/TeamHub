import { Request, Response, NextFunction } from "express";
import { notificationsService } from "./notifications.service";

export const notificationsController = {
  async listMyNotifications(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await notificationsService.listUserNotifications(userId, page, limit);
      return res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async markAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const id = String(req.params.id);

      const result = await notificationsService.markAsRead(id, userId);
      return res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async markAllAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;

      const result = await notificationsService.markAllAsRead(userId);
      return res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async deleteNotification(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const id = String(req.params.id);

      const result = await notificationsService.deleteNotification(id, userId);
      return res.json(result);
    } catch (err) {
      next(err);
    }
  },
};
