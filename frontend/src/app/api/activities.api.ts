import { httpClient } from "./http";

export interface ActivityItem {
  id: string;
  actorId: string;
  workspaceId?: string | null;
  boardId?: string | null;
  cardId?: string | null;
  type: string;
  payload?: any;
  createdAt: string;
  actor: {
    id: string;
    email: string;
    displayName: string;
    avatarUrl?: string | null;
  };
  card?: {
    id: string;
    title: string;
  } | null;
}

export const activitiesApi = {
  getBoardActivities: async (boardId: string): Promise<ActivityItem[]> => {
    const response = await httpClient.get<{ activities: ActivityItem[] }>(`/activities/board/${boardId}`);
    return response.data.activities || [];
  },

  getCardActivities: async (cardId: string): Promise<ActivityItem[]> => {
    const response = await httpClient.get<{ activities: ActivityItem[] }>(`/activities/card/${cardId}`);
    return response.data.activities || [];
  },

  getWorkspaceActivities: async (workspaceId: string): Promise<ActivityItem[]> => {
    const response = await httpClient.get<{ activities: ActivityItem[] }>(`/activities/workspace/${workspaceId}`);
    return response.data.activities || [];
  },
};
