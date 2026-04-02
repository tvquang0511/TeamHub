import { Router } from "express";

import { authJwt } from "../../common/middlewares/authJwt";
import { boardViewRateLimit, boardsRateLimit, chatRateLimit } from "../../common/middlewares/rateLimit";
import { requireBoardAdmin, requireBoardMember } from '../../common/middlewares/requireBoardRole';
import { boardsController } from "./boards.controller";
import { boardMembersController } from "./boardMembers.controller";
import { chatController } from "../chat/chat.controller";
import { chatAttachmentsController } from "../chat/chatAttachments.controller";

export const boardsRoutes = Router();

boardsRoutes.use(authJwt);
boardsRoutes.use(boardsRateLimit);

// MVP API for frontend scaffolding
// GET /boards?workspaceId=:workspaceId
boardsRoutes.get("/", boardsController.list);
boardsRoutes.post("/", boardsController.create);

boardsRoutes.get("/:id", boardsController.get);
boardsRoutes.get("/:id/detail", boardViewRateLimit, boardsController.getDetail);
boardsRoutes.get("/:id/messages", chatRateLimit, chatController.listBoardMessages);
boardsRoutes.post("/:id/messages/attachments/presign", chatRateLimit, chatAttachmentsController.presignUpload);
boardsRoutes.post("/:id/messages/attachments/files", chatRateLimit, chatAttachmentsController.commitFile);
boardsRoutes.post(
	"/:id/messages/attachments/:attachmentId/presign-download",
	chatRateLimit,
	chatAttachmentsController.presignDownload,
);
boardsRoutes.patch("/:id", requireBoardAdmin(), boardsController.update);
boardsRoutes.patch("/:id/visibility", requireBoardAdmin(), boardsController.updateVisibility);
boardsRoutes.patch("/:id/background", requireBoardAdmin(), boardsController.updateBackground);
boardsRoutes.delete("/:id", boardsController.delete);

boardsRoutes.get("/:id/members", requireBoardMember(), boardMembersController.list);
boardsRoutes.post("/:id/members", requireBoardAdmin(), boardMembersController.add);
boardsRoutes.post("/:id/members/by-email", requireBoardAdmin(), boardMembersController.addByEmail);
boardsRoutes.patch("/:id/members/:userId", requireBoardAdmin(), boardMembersController.updateRole);
boardsRoutes.delete("/:id/members/:userId", requireBoardAdmin(), boardMembersController.remove);

boardsRoutes.post("/:id/leave", requireBoardMember(), boardsController.leave);
