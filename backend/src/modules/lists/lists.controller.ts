import { Request, Response } from "express";
import { z } from "zod";

import { createListInputSchema, updateListInputSchema, listsService } from "./lists.service";

const moveListInputSchema = z.object({
  prevId: z.string().uuid().nullable().optional(),
  nextId: z.string().uuid().nullable().optional(),
});

export class ListsController {
  create = async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const input = createListInputSchema.parse(req.body);
    const result = await listsService.create(userId, input);
    res.status(201).json(result);
  };

  list = async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const boardId = String(req.query.boardId ?? "");
    const result = await listsService.list(userId, boardId);
    res.status(200).json(result);
  };

  get = async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const listId = String(req.params.id);
    const result = await listsService.get(userId, listId);
    res.status(200).json(result);
  };

  update = async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const listId = String(req.params.id);
    const input = updateListInputSchema.parse(req.body);
    const result = await listsService.update(userId, listId, input);
    res.status(200).json(result);
  };

  move = async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const listId = String(req.params.id);
    const input = moveListInputSchema.parse(req.body);
    const result = await listsService.move(userId, listId, input);
    res.status(200).json(result);
  };

  delete = async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const listId = String(req.params.id);
    const result = await listsService.delete(userId, listId);
    res.status(200).json(result);
  };
}

export const listsController = new ListsController();
