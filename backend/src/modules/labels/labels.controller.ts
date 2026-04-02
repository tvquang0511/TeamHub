import { Request, Response } from "express";

import { createLabelInputSchema, labelsService, updateLabelInputSchema } from "./labels.service";

export class LabelsController {
  list = async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const boardId = String(req.query.boardId ?? "");
    const result = await labelsService.list(userId, boardId);
    res.status(200).json(result);
  };

  create = async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const input = createLabelInputSchema.parse(req.body);
    const result = await labelsService.create(userId, input);
    res.status(201).json(result);
  };

  update = async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const labelId = String(req.params.id);
    const input = updateLabelInputSchema.parse(req.body);
    const result = await labelsService.update(userId, labelId, input);
    res.status(200).json(result);
  };

  delete = async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const labelId = String(req.params.id);
    const result = await labelsService.delete(userId, labelId);
    res.status(200).json(result);
  };
}

export const labelsController = new LabelsController();
