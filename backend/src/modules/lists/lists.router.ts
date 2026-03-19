import { Router } from "express";

import { authJwt } from "../../common/middlewares/authJwt";
import { listsController } from "./lists.controller";

export const listsRoutes = Router();

listsRoutes.use(authJwt);

// MVP API for frontend scaffolding
// GET /lists?boardId=:boardId
listsRoutes.get("/", listsController.list);
listsRoutes.post("/", listsController.create);

listsRoutes.get("/:id", listsController.get);
listsRoutes.patch("/:id", listsController.update);
