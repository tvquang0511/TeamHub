import { httpClient } from "./http";
import type { Label } from "../types/api";

type LabelsEnvelope = { labels: any[] };
type LabelEnvelope = { label: any };

const mapLabel = (l: any): Label => ({
  id: l.id,
  name: l.name,
  color: l.color ?? "#64748B",
  workspaceId: l.workspaceId,
  createdAt: l.createdAt ?? new Date().toISOString(),
});

export const labelsApi = {
  listByWorkspace: async (workspaceId: string): Promise<Label[]> => {
    const res = await httpClient.get<LabelsEnvelope>("/labels", { params: { workspaceId } });
    return (res.data.labels || []).map(mapLabel);
  },

  create: async (data: { workspaceId: string; name: string; color?: string | null }): Promise<Label> => {
    const res = await httpClient.post<LabelEnvelope>("/labels", {
      workspaceId: data.workspaceId,
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
