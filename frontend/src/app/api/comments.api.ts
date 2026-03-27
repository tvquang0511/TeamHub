import { httpClient } from "./http";

export type CommentAuthor = {
  id: string;
  displayName: string;
  email: string;
};

export type CardComment = {
  id: string;
  cardId: string;
  authorId: string;
  content: string;
  createdAt: string;
  author: CommentAuthor;
};

type ListEnvelope = { comments: CardComment[]; nextCursor: string | null };
type CreateEnvelope = { comment: CardComment };

export const commentsApi = {
  listByCard: async (params: { cardId: string; cursor?: string; limit?: number }) => {
    const response = await httpClient.get<ListEnvelope>("/comments", {
      params,
    });
    return response.data;
  },

  create: async (input: { cardId: string; content: string }) => {
    const response = await httpClient.post<CreateEnvelope>("/comments", input);
    return response.data.comment;
  },

  delete: async (commentId: string) => {
    await httpClient.delete(`/comments/${commentId}`);
  },
};
