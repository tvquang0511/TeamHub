import { Router } from "express";

import { authJwt } from "../../common/middlewares/authJwt";
import { analyticsRateLimit } from "../../common/middlewares/rateLimit";
import { analyticsController } from "./analytics.controller";

export const analyticsRoutes = Router();

analyticsRoutes.use(authJwt);
analyticsRoutes.use(analyticsRateLimit);

analyticsRoutes.get("/boards/:id/analytics", analyticsController.getBoardAnalytics);
