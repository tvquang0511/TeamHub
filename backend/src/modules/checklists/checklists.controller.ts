import { Request, Response } from "express";

import { checklistsService } from "./checklists.service";

export class ChecklistsController {
  listByCard = async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const cardId = String(req.params.cardId);
    const result = await checklistsService.listByCard(userId, cardId);
    return res.json(result);
  };

  createChecklist = async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const cardId = String(req.params.cardId);
    const result = await checklistsService.createChecklist(userId, cardId, req.body);
    return res.status(201).json(result);
  };

  updateChecklist = async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const checklistId = String(req.params.checklistId);
    const result = await checklistsService.updateChecklist(userId, checklistId, req.body);
    return res.json(result);
  };

  deleteChecklist = async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const checklistId = String(req.params.checklistId);
    const result = await checklistsService.deleteChecklist(userId, checklistId);
    return res.json(result);
  };

  createItem = async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const checklistId = String(req.params.checklistId);
    const result = await checklistsService.createItem(userId, checklistId, req.body);
    return res.status(201).json(result);
  };

  updateItem = async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const itemId = String(req.params.itemId);
    const result = await checklistsService.updateItem(userId, itemId, req.body);
    return res.json(result);
  };

  deleteItem = async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const itemId = String(req.params.itemId);
    const result = await checklistsService.deleteItem(userId, itemId);
    return res.json(result);
  };
}

export const checklistsController = new ChecklistsController();
