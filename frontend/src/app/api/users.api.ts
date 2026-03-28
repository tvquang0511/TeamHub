import { httpClient } from "./http";
import type { User } from "../types/api";

export type UserProfile = User & {
  description?: string | null;
};

export const usersApi = {
  me: async (): Promise<UserProfile> => {
    const res = await httpClient.get<{ user: UserProfile }>("/users/me");
    return res.data.user;
  },

  updateMe: async (payload: { displayName?: string; description?: string | null }): Promise<UserProfile> => {
    const res = await httpClient.patch<{ user: UserProfile }>("/users/me", payload);
    return res.data.user;
  },

  initAvatarUpload: async (payload: { fileName: string; contentType: string }) => {
    const res = await httpClient.post<{
      upload: {
        uploadUrl: string;
        method: "PUT";
        headers: Record<string, string>;
        bucket: string;
        objectKey: string;
        url: string;
        expiresIn: number;
      };
    }>("/users/me/avatar/init", payload);
    return res.data.upload;
  },

  commitAvatarUpload: async (payload: { objectKey: string }): Promise<UserProfile> => {
    const res = await httpClient.post<{ user: UserProfile }>("/users/me/avatar/commit", payload);
    return res.data.user;
  },

  // Search users by email or name (for autocomplete)
  search: async (
    query: string,
    options?: { limit?: number; workspaceId?: string; includeSelf?: boolean }
  ): Promise<User[]> => {
    const response = await httpClient.get<{ users: User[] }>("/users/search", {
      params: {
        q: query,
        limit: options?.limit ?? 10,
        // kept for backward compatibility; backend ignores it now
        workspaceId: options?.workspaceId,
      },
    });
    const users = response.data.users || [];

    // Backend now excludes self; this is just a safety net / future-proofing.
    if (options?.includeSelf) return users;
    return users;
  },
};
