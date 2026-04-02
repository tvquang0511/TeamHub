import prisma from "../../db/prisma";

export class CommentsRepo {
  async findCardWorkspaceAndBoard(cardId: string) {
    return (prisma as any).cards.findUnique({
      where: { id: cardId },
      select: {
        id: true,
        archivedAt: true,
        list: {
          select: {
            archivedAt: true,
            board: {
              select: { id: true, workspaceId: true, archivedAt: true, visibility: true },
            },
          },
        },
      },
    });
  }

  async isWorkspaceMember(workspaceId: string, userId: string) {
    return prisma.workspace_members.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
      select: { id: true, role: true },
    });
  }

  async isBoardMember(boardId: string, userId: string) {
    return (prisma as any).board_members.findUnique({
      where: { boardId_userId: { boardId, userId } },
      select: { id: true, role: true },
    });
  }

  async listByCard(cardId: string, opts?: { cursor?: string; limit?: number }) {
    const limit = Math.min(Math.max(opts?.limit ?? 50, 1), 100);

    const items = await prisma.card_comments.findMany({
      where: { cardId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(opts?.cursor
        ? {
            cursor: { id: opts.cursor },
            skip: 1,
          }
        : {}),
      select: {
        id: true,
        cardId: true,
        authorId: true,
        content: true,
        createdAt: true,
        author: { select: { id: true, displayName: true, email: true } },
      },
    });

    const hasMore = items.length > limit;
    const data = hasMore ? items.slice(0, limit) : items;
    const nextCursor = hasMore ? data[data.length - 1]!.id : null;

    return { data, nextCursor };
  }

  async create(cardId: string, authorId: string, content: string) {
    return prisma.card_comments.create({
      data: { cardId, authorId, content },
      select: {
        id: true,
        cardId: true,
        authorId: true,
        content: true,
        createdAt: true,
        author: { select: { id: true, displayName: true, email: true } },
      },
    });
  }

  async findById(commentId: string) {
    return prisma.card_comments.findUnique({
      where: { id: commentId },
      select: {
        id: true,
        cardId: true,
        authorId: true,
        createdAt: true,
        card: {
          select: {
            id: true,
            archivedAt: true,
            list: {
              select: {
                archivedAt: true,
                board: {
                  select: { id: true, workspaceId: true, archivedAt: true, visibility: true },
                },
              },
            },
          },
        },
      },
    });
  }

  async delete(commentId: string) {
    return prisma.card_comments.delete({
      where: { id: commentId },
      select: { id: true },
    });
  }
}

export const commentsRepo = new CommentsRepo();
