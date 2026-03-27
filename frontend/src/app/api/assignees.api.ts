import { httpClient } from "./http";

export type CardAssignee = {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  assignedAt?: string;
};

type ListEnvelope = { assignees: CardAssignee[] };

type UpsertEnvelope =
  | { assignee: { id: string; email: string; displayName: string } }
  | { ok: true };

export const assigneesApi = {
  listByCard: async (cardId: string): Promise<CardAssignee[]> => {
    const res = await httpClient.get<ListEnvelope>(`/assignees/cards/${cardId}/assignees`);
    return res.data.assignees || [];
  },

  assignSelf: async (cardId: string) => {
    const res = await httpClient.post<UpsertEnvelope>(`/assignees/cards/${cardId}/assignees/me`);
    return res.data;
  },

  unassignSelf: async (cardId: string) => {
    await httpClient.delete(`/assignees/cards/${cardId}/assignees/me`);
  },

  addByAdmin: async (cardId: string, userId: string) => {
    const res = await httpClient.post<UpsertEnvelope>(`/assignees/cards/${cardId}/assignees/${userId}`);
    return res.data;
  },

  kickByAdmin: async (cardId: string, userId: string) => {
    await httpClient.delete(`/assignees/cards/${cardId}/assignees/${userId}`);
  },
};
