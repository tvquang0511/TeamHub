import { Request, Response } from "express";
import { z } from "zod";

import {
  chatAttachmentsService,
  chatPresignUploadInputSchema,
  chatCommitFileAttachmentInputSchema,
} from "./chatAttachments.service";

export class ChatAttachmentsController {
  presignUpload = async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const boardId = String(req.params.id);
    const input = chatPresignUploadInputSchema.parse(req.body);
    const result = await chatAttachmentsService.presignUpload(userId, boardId, input);
    res.status(200).json(result);
  };

  commitFile = async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const boardId = String(req.params.id);
    const input = chatCommitFileAttachmentInputSchema.parse(req.body);
    const result = await chatAttachmentsService.commitFile(userId, boardId, input);
    res.status(201).json(result);
  };

  presignDownload = async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const boardId = String(req.params.id);
    const attachmentId = String(req.params.attachmentId);
    const input = z
      .object({
        disposition: z.enum(["inline", "attachment"]).optional(),
      })
      .optional()
      .parse(req.body);

    const result = await chatAttachmentsService.presignDownload(userId, boardId, attachmentId, {
      disposition: input?.disposition,
    });
    res.status(200).json(result);
  };
}

export const chatAttachmentsController = new ChatAttachmentsController();
