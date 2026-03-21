import { httpClient } from "./http";
import type { User } from "../types/api";

export const usersApi = {
  // Search users by email or name (for autocomplete)
  search: async (
    query: string,
    options?: { limit?: number; workspaceId?: string }
  ): Promise<User[]> => {
    const response = await httpClient.get<{ users: User[] }>("/users/search", {
      params: {
        q: query,
        limit: options?.limit ?? 10,
        workspaceId: options?.workspaceId,
      },
    });
    return response.data.users;
  },
};
