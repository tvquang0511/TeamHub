import { httpClient } from "./http";

export type NotificationItem = {
  id: string;
  userId: string;
  actorId?: string | null;
  title: string;
  content: string;
  type: "CARD_ASSIGNED" | "COMMENT_MENTION" | "DUE_DATE_REMINDER" | "WORKSPACE_INVITE" | "GENERAL";
  linkUrl?: string | null;
  isRead: boolean;
  createdAt: string;
  actor?: {
    id: string;
    displayName: string;
    email: string;
    avatarUrl?: string | null;
  } | null;
};

export type ListNotificationsResponse = {
  items: NotificationItem[];
  total: number;
  unreadCount: number;
  page: number;
  limit: number;
  totalPages: number;
};

export const notificationsApi = {
  async listMy(page = 1, limit = 20): Promise<ListNotificationsResponse> {
    const res = await httpClient.get<ListNotificationsResponse>("/notifications", {
      params: { page, limit },
    });
    return res.data;
  },

  async markAsRead(id: string): Promise<{ ok: boolean }> {
    const res = await httpClient.patch<{ ok: boolean }>(`/notifications/${id}/read`);
    return res.data;
  },

  async markAllAsRead(): Promise<{ ok: boolean }> {
    const res = await httpClient.patch<{ ok: boolean }>("/notifications/read-all");
    return res.data;
  },

  async delete(id: string): Promise<{ ok: boolean }> {
    const res = await httpClient.delete<{ ok: boolean }>(`/notifications/${id}`);
    return res.data;
  },
};
