import { Router } from "express";

import { authJwt } from "../../common/middlewares/authJwt";
import { commentsRateLimit } from "../../common/middlewares/rateLimit";
import { commentsController } from "./comments.controller";

export const commentsRoutes = Router();

commentsRoutes.use(authJwt);
commentsRoutes.use(commentsRateLimit);

// List comments for a card (cursor pagination)
// GET /api/comments?cardId=...&cursor=...&limit=...
commentsRoutes.get("/", commentsController.list);

// Create comment
// POST /api/comments { cardId, content }
commentsRoutes.post("/", commentsController.create);

// Delete comment (author or board ADMIN/OWNER)
// DELETE /api/comments/:id
commentsRoutes.delete("/:id", commentsController.delete);
