import { Request, Response } from "express";

import { cardsService, createCardInputSchema, updateCardInputSchema } from "./cards.service";

export class CardsController {
  create = async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const input = createCardInputSchema.parse(req.body);
    const result = await cardsService.create(userId, input);
    res.status(201).json(result);
  };

  list = async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const listId = String(req.query.listId ?? "");
    const result = await cardsService.list(userId, listId);
    res.status(200).json(result);
  };

  get = async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const cardId = String(req.params.id);
    const result = await cardsService.get(userId, cardId);
    res.status(200).json(result);
  };

  update = async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const cardId = String(req.params.id);
    const input = updateCardInputSchema.parse(req.body);
    const result = await cardsService.update(userId, cardId, input);
    res.status(200).json(result);
  };
}

export const cardsController = new CardsController();
