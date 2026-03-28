import { httpClient } from "./http";
import type {
  Card,
  CreateCardRequest,
  ReminderJob,
  UpdateCardRequest,
  MoveCardRequest,
} from "../types/api";

type CardEnvelope = { card: any };
type CardsEnvelope = { cards: any[] };
type RemindersEnvelope = { reminders: ReminderJob[] };
type ReminderEnvelope = { reminder: ReminderJob };

const mapCard = (c: any): Card => ({
  id: c.id,
  title: c.title,
  description: c.description ?? undefined,
  listId: c.listId,
  position: typeof c.position === "number" ? c.position : Number(c.position ?? 0),
  dueAt: c.dueAt ?? undefined,
  isDone: c.isDone ?? undefined,
  labels: [],
  assignees: [],
  createdAt: c.createdAt ?? new Date().toISOString(),
  updatedAt: c.updatedAt ?? new Date().toISOString(),
});

export const cardsApi = {
  // Get card by ID
  getById: async (id: string): Promise<Card> => {
    const response = await httpClient.get<CardEnvelope>(`/cards/${id}`);
    return mapCard(response.data.card);
  },

  // Create card
  create: async (data: CreateCardRequest): Promise<Card> => {
    const response = await httpClient.post<CardEnvelope>("/cards", {
      title: data.title,
      description: data.description,
      listId: data.listId,
    });
    return mapCard(response.data.card);
  },

  // List cards by list
  listByList: async (listId: string): Promise<Card[]> => {
    const response = await httpClient.get<CardsEnvelope>("/cards", {
      params: { listId },
    });
    return (response.data.cards || []).map(mapCard);
  },

  // Update card
  update: async (id: string, data: UpdateCardRequest): Promise<Card> => {
    const response = await httpClient.patch<CardEnvelope>(`/cards/${id}`, {
      title: data.title,
      description: data.description,
      dueAt: data.dueAt === undefined ? data.dueDate : data.dueAt,
      isDone: data.isDone,
    });
    return mapCard(response.data.card);
  },

  setDueDate: async (id: string, dueAt: string | null): Promise<Card> => {
    const response = await httpClient.patch<CardEnvelope>(`/cards/${id}/due-date`, { dueAt });
    return mapCard(response.data.card);
  },

  setDone: async (id: string, isDone: boolean): Promise<Card> => {
    const response = await httpClient.patch<CardEnvelope>(`/cards/${id}/done`, { isDone });
    return mapCard(response.data.card);
  },

  // Delete card
  delete: async (id: string): Promise<void> => {
    await httpClient.delete(`/cards/${id}`);
  },

  // Move card (between lists or reorder within list)
  move: async (id: string, data: MoveCardRequest): Promise<Card> => {
    const response = await httpClient.post<CardEnvelope>(`/cards/${id}/move`, {
      listId: data.toListId ?? undefined,
      prevId: data.prevCardId ?? null,
      nextId: data.nextCardId ?? null,
    });
    return mapCard(response.data.card);
  },

  // Reminders (per-user)
  listReminders: async (cardId: string): Promise<ReminderJob[]> => {
    const response = await httpClient.get<RemindersEnvelope>(`/cards/${cardId}/reminders`);
    return response.data.reminders ?? [];
  },

  setReminder: async (cardId: string, remindAt: string): Promise<ReminderJob> => {
    const response = await httpClient.put<ReminderEnvelope>(`/cards/${cardId}/reminders`, { remindAt });
    return response.data.reminder;
  },

  cancelReminder: async (cardId: string, reminderJobId: string): Promise<void> => {
    await httpClient.delete(`/cards/${cardId}/reminders/${reminderJobId}`);
  },
};
