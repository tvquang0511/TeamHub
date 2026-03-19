import { Router } from "express";

import { authJwt } from "../../common/middlewares/authJwt";
import { boardsController } from "./boards.controller";

export const boardsRoutes = Router();

boardsRoutes.use(authJwt);

// MVP API for frontend scaffolding
// GET /boards?workspaceId=:workspaceId
boardsRoutes.get("/", boardsController.list);
boardsRoutes.post("/", boardsController.create);

boardsRoutes.get("/:id", boardsController.get);
boardsRoutes.patch("/:id", boardsController.update);
