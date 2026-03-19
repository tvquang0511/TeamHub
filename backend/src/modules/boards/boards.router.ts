import { Router } from "express";

import { authJwt } from "../../common/middlewares/authJwt";
import { boardsController } from "./boards.controller";
import { boardMembersController } from "./boardMembers.controller";

export const boardsRoutes = Router();

boardsRoutes.use(authJwt);

// MVP API for frontend scaffolding
// GET /boards?workspaceId=:workspaceId
boardsRoutes.get("/", boardsController.list);
boardsRoutes.post("/", boardsController.create);

boardsRoutes.get("/:id", boardsController.get);
boardsRoutes.get("/:id/detail", boardsController.getDetail);
boardsRoutes.patch("/:id", boardsController.update);

boardsRoutes.get("/:id/members", boardMembersController.list);
boardsRoutes.post("/:id/members", boardMembersController.add);
boardsRoutes.post("/:id/members/by-email", boardMembersController.addByEmail);
boardsRoutes.delete("/:id/members/:userId", boardMembersController.remove);
