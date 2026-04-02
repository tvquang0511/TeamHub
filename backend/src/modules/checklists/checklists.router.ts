import { Router } from "express";

import { authJwt } from "../../common/middlewares/authJwt";
import { checklistsRateLimit } from "../../common/middlewares/rateLimit";
import { checklistsController } from "./checklists.controller";

export const checklistsRoutes = Router();
checklistsRoutes.use(authJwt);
checklistsRoutes.use(checklistsRateLimit);

// Card -> Checklists
checklistsRoutes.get("/cards/:cardId/checklists", checklistsController.listByCard);
checklistsRoutes.post("/cards/:cardId/checklists", checklistsController.createChecklist);

// Checklist
checklistsRoutes.patch("/checklists/:checklistId", checklistsController.updateChecklist);
checklistsRoutes.delete("/checklists/:checklistId", checklistsController.deleteChecklist);

// Checklist items
checklistsRoutes.post("/checklists/:checklistId/items", checklistsController.createItem);
checklistsRoutes.patch("/items/:itemId", checklistsController.updateItem);
checklistsRoutes.delete("/items/:itemId", checklistsController.deleteItem);
