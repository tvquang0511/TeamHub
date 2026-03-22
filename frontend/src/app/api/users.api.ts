import { httpClient } from "./http";
import type { User } from "../types/api";

export const usersApi = {
  // Search users by email or name (for autocomplete)
  search: async (
    query: string,
    options?: { limit?: number; workspaceId?: string; includeSelf?: boolean }
  ): Promise<User[]> => {
    const response = await httpClient.get<{ users: User[] }>("/users/search", {
      params: {
        q: query,
        limit: options?.limit ?? 10,
        workspaceId: options?.workspaceId,
      },
    });
    const users = response.data.users || [];

    // Backend now excludes self; this is just a safety net / future-proofing.
    if (options?.includeSelf) return users;
    return users;
  },
};
