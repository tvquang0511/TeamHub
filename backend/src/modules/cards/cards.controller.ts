import { Request, Response } from "express";
import { z } from "zod";

import { cardsService, createCardInputSchema, updateCardInputSchema } from "./cards.service";

const dueDateInputSchema = z.object({
  dueAt: z.string().datetime().nullable(),
});

const doneInputSchema = z.object({
  isDone: z.boolean(),
});

const moveCardInputSchema = z.object({
  // Destination listId optional: when omitted, reorder within current list
  listId: z.string().uuid().optional(),
  prevId: z.string().uuid().nullable().optional(),
  nextId: z.string().uuid().nullable().optional(),
});

const setReminderInputSchema = z.object({
  remindAt: z.string().datetime(),
});

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

  setDueDate = async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const cardId = String(req.params.id);
    const input = dueDateInputSchema.parse(req.body);
    const result = await cardsService.setDueDate(userId, cardId, input);
    res.status(200).json(result);
  };

  setDone = async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const cardId = String(req.params.id);
    const input = doneInputSchema.parse(req.body);
    const result = await cardsService.setDone(userId, cardId, input);
    res.status(200).json(result);
  };

  listReminders = async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const cardId = String(req.params.id);
    const result = await cardsService.listReminders(userId, cardId);
    res.status(200).json(result);
  };

  setReminder = async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const cardId = String(req.params.id);
    const input = setReminderInputSchema.parse(req.body);
    const result = await cardsService.setReminder(userId, cardId, input);
    res.status(201).json(result);
  };

  cancelReminder = async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const cardId = String(req.params.id);
    const reminderJobId = String(req.params.reminderJobId);
    const result = await cardsService.cancelReminder(userId, cardId, reminderJobId);
    res.status(200).json(result);
  };

  move = async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const cardId = String(req.params.id);
    const input = moveCardInputSchema.parse(req.body);
    const result = await cardsService.move(userId, cardId, input);
    res.status(200).json(result);
  };

  delete = async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const cardId = String(req.params.id);
    const result = await cardsService.delete(userId, cardId);
    res.status(200).json(result);
  };

  listLabels = async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const cardId = String(req.params.id);
    const result = await cardsService.listLabels(userId, cardId);
    res.status(200).json(result);
  };

  attachLabel = async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const cardId = String(req.params.id);
    const labelId = String(req.params.labelId);
    const result = await cardsService.attachLabel(userId, cardId, labelId);
    res.status(200).json(result);
  };

  detachLabel = async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const cardId = String(req.params.id);
    const labelId = String(req.params.labelId);
    const result = await cardsService.detachLabel(userId, cardId, labelId);
    res.status(200).json(result);
  };
}

export const cardsController = new CardsController();
