import { Request, Response } from "express";

import {
  attachmentsService,
  presignUploadInputSchema,
  commitFileAttachmentInputSchema,
  createLinkAttachmentInputSchema,
  createCardAttachmentInputSchema,
} from "./attachments.service";

export class AttachmentsController {
  listByCard = async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const cardId = String(req.params.cardId);
    const result = await attachmentsService.list(userId, cardId);
    res.status(200).json(result);
  };

  presignUpload = async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const cardId = String(req.params.cardId);
    const input = presignUploadInputSchema.parse(req.body);
    const result = await attachmentsService.presignUpload(userId, cardId, input);
    res.status(200).json(result);
  };

  commitFile = async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const cardId = String(req.params.cardId);
    const input = commitFileAttachmentInputSchema.parse(req.body);
    const result = await attachmentsService.commitFile(userId, cardId, input);
    res.status(201).json(result);
  };

  createLink = async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const cardId = String(req.params.cardId);
    const input = createLinkAttachmentInputSchema.parse(req.body);
    const result = await attachmentsService.createLink(userId, cardId, input);
    res.status(201).json(result);
  };

  createCardRef = async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const cardId = String(req.params.cardId);
    const input = createCardAttachmentInputSchema.parse(req.body);
    const result = await attachmentsService.createCardRef(userId, cardId, input);
    res.status(201).json(result);
  };

  delete = async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const attachmentId = String(req.params.attachmentId);
    const result = await attachmentsService.delete(userId, attachmentId);
    res.status(200).json(result);
  };

  presignDownload = async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const attachmentId = String(req.params.attachmentId);
    const result = await attachmentsService.presignDownload(userId, attachmentId);
    res.status(200).json(result);
  };
}

export const attachmentsController = new AttachmentsController();
