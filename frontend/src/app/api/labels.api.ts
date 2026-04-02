import { httpClient } from "./http";
import type { Label } from "../types/api";

type LabelsEnvelope = { labels: any[] };
type LabelEnvelope = { label: any };

const mapLabel = (l: any): Label => ({
  id: l.id,
  name: l.name,
  color: l.color ?? "#64748B",
  boardId: l.boardId,
  createdAt: l.createdAt ?? new Date().toISOString(),
});

export const labelsApi = {
  listByBoard: async (boardId: string): Promise<Label[]> => {
    const res = await httpClient.get<LabelsEnvelope>("/labels", { params: { boardId } });
    return (res.data.labels || []).map(mapLabel);
  },

  create: async (data: { boardId: string; name: string; color?: string | null }): Promise<Label> => {
    const res = await httpClient.post<LabelEnvelope>("/labels", {
      boardId: data.boardId,
      name: data.name,
      color: data.color ?? null,
    });
    return mapLabel(res.data.label);
  },

  update: async (id: string, data: { name?: string; color?: string | null }): Promise<Label> => {
    const res = await httpClient.patch<LabelEnvelope>(`/labels/${id}`, {
      name: data.name,
      color: data.color === undefined ? undefined : data.color,
    });
    return mapLabel(res.data.label);
  },

  delete: async (id: string): Promise<void> => {
    await httpClient.delete(`/labels/${id}`);
  },

  listByCard: async (cardId: string): Promise<Label[]> => {
    const res = await httpClient.get<{ labels: any[] }>(`/cards/${cardId}/labels`);
    return (res.data.labels || []).map(mapLabel);
  },

  attachToCard: async (cardId: string, labelId: string): Promise<void> => {
    await httpClient.post(`/cards/${cardId}/labels/${labelId}`);
  },

  detachFromCard: async (cardId: string, labelId: string): Promise<void> => {
    await httpClient.delete(`/cards/${cardId}/labels/${labelId}`);
  },
};
