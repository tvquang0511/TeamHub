import { Request, Response } from "express";
import { activitiesService } from "./activities.service";

export const activitiesController = {
  getBoardActivities: async (req: Request, res: Response) => {
    const boardId = String(req.params.boardId);
    const result = await activitiesService.listByBoard(boardId);
    res.status(200).json(result);
  },

  getCardActivities: async (req: Request, res: Response) => {
    const cardId = String(req.params.cardId);
    const result = await activitiesService.listByCard(cardId);
    res.status(200).json(result);
  },

  getWorkspaceActivities: async (req: Request, res: Response) => {
    const workspaceId = String(req.params.workspaceId);
    const result = await activitiesService.listByWorkspace(workspaceId);
    res.status(200).json(result);
  },

  pruneOldActivities: async (req: Request, res: Response) => {
    const days = req.body.days ? parseInt(req.body.days) : 30;
    const result = await activitiesService.pruneOldActivities(days);
    res.status(200).json(result);
  },
};
