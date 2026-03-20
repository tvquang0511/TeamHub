import { httpClient } from "./http";
import type { List, CreateListRequest, MoveListRequest } from "../types/api";

type ListEnvelope = { list: any };
type ListsEnvelope = { lists: any[] };

const mapList = (l: any): List => ({
  id: l.id,
  name: l.name,
  boardId: l.boardId,
  position: typeof l.position === "number" ? l.position : Number(l.position ?? 0),
  cards: [],
  createdAt: l.createdAt ?? new Date().toISOString(),
  updatedAt: l.updatedAt ?? new Date().toISOString(),
});

export const listsApi = {
  // Create list
  create: async (data: CreateListRequest): Promise<List> => {
    const response = await httpClient.post<ListEnvelope>("/lists", data);
    return mapList(response.data.list);
  },

  // List lists by board
  listByBoard: async (boardId: string): Promise<List[]> => {
    const response = await httpClient.get<ListsEnvelope>("/lists", {
      params: { boardId },
    });
    return (response.data.lists || []).map(mapList);
  },

  // Update list
  update: async (id: string, data: { name: string }): Promise<List> => {
    const response = await httpClient.patch<ListEnvelope>(`/lists/${id}`, data);
    return mapList(response.data.list);
  },

  // Delete list
  delete: async (id: string): Promise<void> => {
    await httpClient.delete(`/lists/${id}`);
  },

  // Move/reorder list
  move: async (id: string, data: MoveListRequest): Promise<List> => {
    const response = await httpClient.post<ListEnvelope>(`/lists/${id}/move`, {
      prevId: data.prevListId ?? null,
      nextId: data.nextListId ?? null,
    });
    return mapList(response.data.list);
  },
};
