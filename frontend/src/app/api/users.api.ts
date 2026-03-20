import { httpClient } from "./http";
import type { User } from "../types/api";

export const usersApi = {
  // Search users by email or name (for autocomplete)
  search: async (query: string, limit: number = 10): Promise<User[]> => {
    const response = await httpClient.get<User[]>("/users/search", {
      params: { q: query, limit },
    });
    return response.data;
  },
};
