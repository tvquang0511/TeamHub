import { z } from "zod";
import { activity_type } from "@prisma/client";

import { ApiError } from "../../common/errors/ApiError";
import { activitiesRepo } from "../activities/activities.repo";
import { commentsRepo } from "./comments.repo";

export const listCommentsQuerySchema = z.object({
  cardId: z.string().uuid(),
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const createCommentInputSchema = z.object({
  cardId: z.string().uuid(),
  content: z
    .string()
    .trim()
    .min(1)
    .max(5000),
});

export class CommentsService {
  private async assertCardReadable(userId: string, cardId: string) {
    const card = await commentsRepo.findCardWorkspaceAndBoard(cardId);
    if (!card || card.archivedAt || card.list.archivedAt || card.list.board.archivedAt) {
      throw new ApiError(404, "CARD_NOT_FOUND", "Card not found");
    }

    const workspaceId = card.list.board.workspaceId;
    const membership = await commentsRepo.isWorkspaceMember(workspaceId, userId);
    if (!membership) throw new ApiError(403, "WORKSPACE_FORBIDDEN", "You are not a member of this workspace");

    if (card.list.board.visibility !== "WORKSPACE") {
      const boardMember = await commentsRepo.isBoardMember(card.list.board.id, userId);
      if (!boardMember) {
        if (membership.role !== "OWNER" && membership.role !== "ADMIN") {
          throw new ApiError(404, "BOARD_NOT_FOUND", "Board not found");
        }
      }
    }

    return card;
  }

  private async assertCardWritable(userId: string, cardId: string) {
    const card = await this.assertCardReadable(userId, cardId);

    // Write requires board membership regardless of WORKSPACE visibility.
    const boardMember = await commentsRepo.isBoardMember(card.list.board.id, userId);
    if (!boardMember) {
      throw new ApiError(403, "BOARD_FORBIDDEN", "Board is read-only for non-members");
    }

    return card;
  }

  async list(userId: string, query: z.infer<typeof listCommentsQuerySchema>) {
    await this.assertCardReadable(userId, query.cardId);

    const { data, nextCursor } = await commentsRepo.listByCard(query.cardId, {
      cursor: query.cursor,
      limit: query.limit,
    });

    return { comments: data, nextCursor };
  }

  async create(userId: string, input: z.infer<typeof createCommentInputSchema>) {
    const card = await this.assertCardWritable(userId, input.cardId);

    const comment = await commentsRepo.create(input.cardId, userId, input.content);

    await activitiesRepo.createSafe({
      actorId: userId,
      workspaceId: card.list.board.workspaceId,
      boardId: card.list.board.id,
      cardId: card.id,
      type: activity_type.COMMENT_ADDED,
      payload: { commentId: comment.id },
    });

    return { comment };
  }

  async delete(userId: string, commentId: string) {
    const existing = await commentsRepo.findById(commentId);
    if (!existing) throw new ApiError(404, "COMMENT_NOT_FOUND", "Comment not found");

    const card = existing.card;
    if (!card || card.archivedAt || card.list.archivedAt || card.list.board.archivedAt) {
      throw new ApiError(404, "CARD_NOT_FOUND", "Card not found");
    }

    const workspaceId = card.list.board.workspaceId;
    const membership = await commentsRepo.isWorkspaceMember(workspaceId, userId);
    if (!membership) throw new ApiError(403, "WORKSPACE_FORBIDDEN", "You are not a member of this workspace");

    const boardMember = await commentsRepo.isBoardMember(card.list.board.id, userId);
    if (!boardMember) throw new ApiError(403, "BOARD_FORBIDDEN", "Board is read-only for non-members");

    const isAdmin = boardMember.role === "OWNER" || boardMember.role === "ADMIN";
    const isAuthor = existing.authorId === userId;

    if (!isAdmin && !isAuthor) {
      throw new ApiError(403, "COMMENT_FORBIDDEN", "You cannot delete this comment");
    }

    await commentsRepo.delete(commentId);
    return { ok: true };
  }
}

export const commentsService = new CommentsService();
