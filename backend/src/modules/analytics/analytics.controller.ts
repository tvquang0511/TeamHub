import type { Request, Response } from "express";

import { analyticsService, analyticsQuerySchema } from "./analytics.service";

export const analyticsController = {
  getBoardAnalytics: async (req: Request, res: Response) => {
    const userId = (req as any).user?.id as string | undefined;
    const boardId = String(req.params.id);
    const query = analyticsQuerySchema.parse(req.query);

    const data = await analyticsService.getBoardAnalytics(userId!, boardId, query);
    res.json({ analytics: data });
  },
};
