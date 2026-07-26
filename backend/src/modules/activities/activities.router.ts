import { Router } from "express";
import { authJwt } from "../../common/middlewares/authJwt";
import { activitiesController } from "./activities.controller";

export const activitiesRoutes = Router();

activitiesRoutes.use(authJwt);

activitiesRoutes.get("/board/:boardId", activitiesController.getBoardActivities);
activitiesRoutes.get("/card/:cardId", activitiesController.getCardActivities);
activitiesRoutes.get("/workspace/:workspaceId", activitiesController.getWorkspaceActivities);
activitiesRoutes.post("/prune", activitiesController.pruneOldActivities);
