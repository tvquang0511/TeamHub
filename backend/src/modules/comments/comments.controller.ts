import { Request, Response } from "express";

import {
  CommentsService,
  createCommentInputSchema,
  listCommentsQuerySchema,
} from "./comments.service";

export class CommentsController {
  constructor(private service: CommentsService) {}

  list = async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const query = listCommentsQuerySchema.parse(req.query);
    const result = await this.service.list(userId, query);
    res.status(200).json(result);
  };

  create = async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const input = createCommentInputSchema.parse(req.body);
    const result = await this.service.create(userId, input);
    res.status(201).json(result);
  };

  delete = async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const commentId = String(req.params.id);
    const result = await this.service.delete(userId, commentId);
    res.status(200).json(result);
  };
}

export const commentsController = new CommentsController(new CommentsService());
