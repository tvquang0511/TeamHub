import { Router } from "express";

import { authJwt } from "../../common/middlewares/authJwt";
import { attachmentsController } from "./attachments.controller";

export const attachmentsRoutes = Router();

attachmentsRoutes.use(authJwt);

// List attachments of a card
attachmentsRoutes.get("/cards/:cardId", attachmentsController.listByCard);

// FILE upload flow:
// 1) presign PUT URL
attachmentsRoutes.post("/cards/:cardId/presign", attachmentsController.presignUpload);
// 2) commit metadata after uploading to MinIO
attachmentsRoutes.post("/cards/:cardId/files", attachmentsController.commitFile);

// LINK shortcut
attachmentsRoutes.post("/cards/:cardId/links", attachmentsController.createLink);

// CARD reference (attach another card)
attachmentsRoutes.post("/cards/:cardId/cards", attachmentsController.createCardRef);

// delete attachment
attachmentsRoutes.delete("/:attachmentId", attachmentsController.delete);

// private download (presigned GET)
attachmentsRoutes.post("/:attachmentId/presign-download", attachmentsController.presignDownload);
