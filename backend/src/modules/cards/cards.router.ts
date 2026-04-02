import { Router } from "express";

import { authJwt } from "../../common/middlewares/authJwt";
import { cardDetailRateLimit, cardsRateLimit } from "../../common/middlewares/rateLimit";
import { cardsController } from "./cards.controller";

export const cardsRoutes = Router();

cardsRoutes.use(authJwt);
cardsRoutes.use(cardsRateLimit);

// MVP API for frontend scaffolding
// GET /cards?listId=:listId
cardsRoutes.get("/", cardsController.list);
cardsRoutes.post("/", cardsController.create);

cardsRoutes.get("/:id", cardDetailRateLimit, cardsController.get);
cardsRoutes.patch("/:id", cardsController.update);

// Dedicated endpoints for convenience (reminders/done toggle)
cardsRoutes.patch("/:id/due-date", cardsController.setDueDate);
cardsRoutes.patch("/:id/done", cardsController.setDone);

// Reminders (per-user)
cardsRoutes.get("/:id/reminders", cardsController.listReminders);
cardsRoutes.put("/:id/reminders", cardsController.setReminder);
cardsRoutes.delete("/:id/reminders/:reminderJobId", cardsController.cancelReminder);

cardsRoutes.delete("/:id", cardsController.delete);

// Labels on card
cardsRoutes.get("/:id/labels", cardsController.listLabels);
cardsRoutes.post("/:id/labels/:labelId", cardsController.attachLabel);
cardsRoutes.delete("/:id/labels/:labelId", cardsController.detachLabel);

// Move/reorder using prev/next anchors
cardsRoutes.post("/:id/move", cardsController.move);
