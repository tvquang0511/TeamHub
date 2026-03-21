import { Request, Response } from "express";

import { createBoardInputSchema, updateBoardInputSchema, boardsService } from "./boards.service";

export class BoardsController {
  create = async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const input = createBoardInputSchema.parse(req.body);
    const result = await boardsService.create(userId, input);
    res.status(201).json(result);
  };

  list = async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const workspaceId = String(req.query.workspaceId ?? "");
    const result = await boardsService.list(userId, workspaceId);
    res.status(200).json(result);
  };

  get = async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const boardId = String(req.params.id);
    const result = await boardsService.get(userId, boardId);
    res.status(200).json(result);
  };

  getDetail = async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const boardId = String(req.params.id);
    const result = await boardsService.getDetail(userId, boardId);
    res.status(200).json(result);
  };

  update = async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const boardId = String(req.params.id);
    const input = updateBoardInputSchema.parse(req.body);
    const result = await boardsService.update(userId, boardId, input);
    res.status(200).json(result);
  };

  delete = async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const boardId = String(req.params.id);
    const result = await boardsService.delete(userId, boardId);
    res.status(200).json(result);
  };

  leave = async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const boardId = String(req.params.id);
    const result = await boardsService.leaveBoard(userId, boardId);
    res.status(200).json(result);
  };
}

export const boardsController = new BoardsController();
