import { httpClient } from "./http";
import type { BoardAnalyticsResponse } from "../types/api";

type AnalyticsEnvelope = { analytics: BoardAnalyticsResponse };

export const analyticsApi = {
  getBoardAnalytics: async (
    boardId: string,
    params?: { range?: "7d" | "30d" | "90d" | "1y"; from?: string; to?: string },
  ): Promise<BoardAnalyticsResponse> => {
    const res = await httpClient.get<AnalyticsEnvelope>(`/boards/${boardId}/analytics`, {
      params,
    });
    return res.data.analytics;
  },
};
