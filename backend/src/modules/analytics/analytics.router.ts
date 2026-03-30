import { Router } from "express";

import { authJwt } from "../../common/middlewares/authJwt";
import { analyticsController } from "./analytics.controller";

export const analyticsRoutes = Router();

analyticsRoutes.use(authJwt);

analyticsRoutes.get("/boards/:id/analytics", analyticsController.getBoardAnalytics);
