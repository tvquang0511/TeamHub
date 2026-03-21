import { Router } from "express";

import { authJwt } from "../../common/middlewares/authJwt";
import { cardsController } from "./cards.controller";

export const cardsRoutes = Router();

cardsRoutes.use(authJwt);

// MVP API for frontend scaffolding
// GET /cards?listId=:listId
cardsRoutes.get("/", cardsController.list);
cardsRoutes.post("/", cardsController.create);

cardsRoutes.get("/:id", cardsController.get);
cardsRoutes.patch("/:id", cardsController.update);
cardsRoutes.delete("/:id", cardsController.delete);

// Move/reorder using prev/next anchors
cardsRoutes.post("/:id/move", cardsController.move);
