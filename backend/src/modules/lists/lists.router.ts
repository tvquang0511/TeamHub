import { Router } from "express";

import { authJwt } from "../../common/middlewares/authJwt";
import { listsRateLimit } from "../../common/middlewares/rateLimit";
import { listsController } from "./lists.controller";

export const listsRoutes = Router();

listsRoutes.use(authJwt);
listsRoutes.use(listsRateLimit);

// MVP API for frontend scaffolding
// GET /lists?boardId=:boardId
listsRoutes.get("/", listsController.list);
listsRoutes.post("/", listsController.create);

listsRoutes.get("/:id", listsController.get);
listsRoutes.patch("/:id", listsController.update);
listsRoutes.delete("/:id", listsController.delete);

// Move/reorder using prev/next anchors
listsRoutes.post("/:id/move", listsController.move);
