import { httpClient } from "./http";
import type { BoardAnalyticsResponse } from "../types/api";

export interface WorkspaceAnalyticsResponse {
  workspace: { id: string; name: string };
  kpis: {
    totalBoards: number;
    totalCards: number;
    completedCards: number;
    overdueCards: number;
    completionRate: number;
    totalEstimatedHours: number;
    totalLoggedHours: number;
  };
  boardStats: Array<{
    id: string;
    name: string;
    totalCards: number;
    completedCards: number;
    overdueCards: number;
    estimatedHours: number;
    loggedHours: number;
    completionRate: number;
  }>;
  memberStats: Array<{
    user: { id: string; displayName: string; email: string; avatarUrl?: string | null };
    assignedCards: number;
    completedCards: number;
    loggedHours: number;
  }>;
}

type AnalyticsEnvelope = { analytics: BoardAnalyticsResponse };
type WorkspaceAnalyticsEnvelope = { analytics: WorkspaceAnalyticsResponse };

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

  getWorkspaceAnalytics: async (workspaceId: string): Promise<WorkspaceAnalyticsResponse> => {
    const res = await httpClient.get<WorkspaceAnalyticsEnvelope>(`/workspaces/${workspaceId}/analytics`);
    return res.data.analytics;
  },
};
