import { Router } from "express";

import { authJwt } from "../../common/middlewares/authJwt";
import { assigneesRateLimit } from "../../common/middlewares/rateLimit";
import { assigneesController } from "./assignees.controller";

export const assigneesRoutes = Router();
assigneesRoutes.use(authJwt);
assigneesRoutes.use(assigneesRateLimit);

// View assignees
assigneesRoutes.get("/cards/:cardId/assignees", assigneesController.list);

// Self assign/unassign
assigneesRoutes.post("/cards/:cardId/assignees/me", assigneesController.assignSelf);
assigneesRoutes.delete("/cards/:cardId/assignees/me", assigneesController.unassignSelf);

// Admin/Owner add/kick others
assigneesRoutes.post("/cards/:cardId/assignees/:userId", assigneesController.addByAdmin);
assigneesRoutes.delete("/cards/:cardId/assignees/:userId", assigneesController.kickByAdmin);
