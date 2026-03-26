import { Request, Response } from "express";

import { assigneesService } from "./assignees.service";

export class AssigneesController {
  list = async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const cardId = String(req.params.cardId);
    const result = await assigneesService.list(userId, cardId);
    res.status(200).json(result);
  };

  assignSelf = async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const cardId = String(req.params.cardId);
    const result = await assigneesService.assignSelf(userId, cardId);
    res.status(200).json(result);
  };

  unassignSelf = async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const cardId = String(req.params.cardId);
    const result = await assigneesService.unassignSelf(userId, cardId);
    res.status(200).json(result);
  };

  addByAdmin = async (req: Request, res: Response) => {
    const actorId = req.user!.id;
    const cardId = String(req.params.cardId);
    const targetUserId = String(req.params.userId);
    const result = await assigneesService.addByAdmin(actorId, cardId, targetUserId);
    res.status(200).json(result);
  };

  kickByAdmin = async (req: Request, res: Response) => {
    const actorId = req.user!.id;
    const cardId = String(req.params.cardId);
    const targetUserId = String(req.params.userId);
    const result = await assigneesService.kickByAdmin(actorId, cardId, targetUserId);
    res.status(200).json(result);
  };
}

export const assigneesController = new AssigneesController();
