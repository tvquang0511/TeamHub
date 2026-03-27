import { httpClient } from "./http";

export type ChecklistItem = {
  id: string;
  checklistId: string;
  title: string;
  position: number;
  isDone: boolean;
  createdAt: string;
};

export type Checklist = {
  id: string;
  cardId: string;
  title: string;
  position: number;
  createdAt: string;
  items?: ChecklistItem[];
};

type ListByCardEnvelope = { checklists: any[] };

type ChecklistEnvelope = { checklist: any };

type ItemEnvelope = { item: any };

type DeleteEnvelope = { ok?: boolean };

const mapItem = (i: any): ChecklistItem => ({
  id: i.id,
  checklistId: i.checklistId,
  title: i.title,
  position: typeof i.position === "number" ? i.position : Number(i.position ?? 0),
  isDone: Boolean(i.isDone),
  createdAt: i.createdAt ?? new Date().toISOString(),
});

const mapChecklist = (c: any): Checklist => ({
  id: c.id,
  cardId: c.cardId,
  title: c.title,
  position: typeof c.position === "number" ? c.position : Number(c.position ?? 0),
  createdAt: c.createdAt ?? new Date().toISOString(),
  items: Array.isArray(c.items) ? c.items.map(mapItem) : [],
});

export const checklistsApi = {
  listByCard: async (cardId: string): Promise<{ checklists: Checklist[] }> => {
    const res = await httpClient.get<ListByCardEnvelope>(`/checklists/cards/${cardId}/checklists`);
    return { checklists: (res.data.checklists || []).map(mapChecklist) };
  },

  createChecklist: async (cardId: string, data: { title: string }): Promise<Checklist> => {
    const res = await httpClient.post<ChecklistEnvelope>(`/checklists/cards/${cardId}/checklists`, data);
    return mapChecklist(res.data.checklist ?? res.data);
  },

  updateChecklist: async (checklistId: string, data: { title?: string }): Promise<Checklist> => {
    const res = await httpClient.patch<ChecklistEnvelope>(`/checklists/checklists/${checklistId}`, data);
    return mapChecklist(res.data.checklist ?? res.data);
  },

  deleteChecklist: async (checklistId: string): Promise<DeleteEnvelope> => {
    const res = await httpClient.delete(`/checklists/checklists/${checklistId}`);
    return res.data as any;
  },

  createItem: async (checklistId: string, data: { title: string }): Promise<ChecklistItem> => {
    const res = await httpClient.post<ItemEnvelope>(`/checklists/checklists/${checklistId}/items`, data);
    return mapItem(res.data.item ?? res.data);
  },

  updateItem: async (itemId: string, data: { title?: string; isDone?: boolean }): Promise<ChecklistItem> => {
    const res = await httpClient.patch<ItemEnvelope>(`/checklists/items/${itemId}`, data);
    return mapItem(res.data.item ?? res.data);
  },

  deleteItem: async (itemId: string): Promise<DeleteEnvelope> => {
    const res = await httpClient.delete(`/checklists/items/${itemId}`);
    return res.data as any;
  },
};
