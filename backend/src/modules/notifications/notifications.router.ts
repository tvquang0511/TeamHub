import { Router } from "express";
import { authJwt } from "../../common/middlewares/authJwt";
import { notificationsController } from "./notifications.controller";

const router = Router();

router.use(authJwt);

router.get("/", notificationsController.listMyNotifications);
router.patch("/read-all", notificationsController.markAllAsRead);
router.patch("/:id/read", notificationsController.markAsRead);
router.delete("/:id", notificationsController.deleteNotification);

export default router;
