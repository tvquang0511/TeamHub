import { z } from "zod";

import { ApiError } from "../../common/errors/ApiError";
import prisma from "../../db/prisma";
import env from "../../config/env";
import { cacheGetJson, cacheKey, cacheSetJson, getAnalyticsCacheVersion } from "../../integrations/cache/redisCache";
import { boardsRepo } from "../boards/boards.repo";
import { workspacesRepo } from "../workspaces/workspaces.repo";

export const analyticsQuerySchema = z.object({
  range: z.enum(["7d", "30d", "90d", "1y"]).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

const startOfDayUtc = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
const addDaysUtc = (d: Date, days: number) => new Date(d.getTime() + days * 24 * 60 * 60 * 1000);

const toYmd = (d: Date) => d.toISOString().slice(0, 10);

const parseDateArg = (value?: string) => {
  if (!value) return null;
  const parts = value.split("-").map((p) => Number(p));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null;
  const [y, m, day] = parts;
  return new Date(Date.UTC(y, m - 1, day));
};

const average = (values: Array<number | null>) => {
  const filtered = values.filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  if (!filtered.length) return null;
  const total = filtered.reduce((sum, v) => sum + v, 0);
  return Math.round(total / filtered.length);
};

export class AnalyticsService {
  async getBoardAnalytics(userId: string, boardId: string, query: z.infer<typeof analyticsQuerySchema>) {
    const board = await boardsRepo.findById(boardId);
    if (!board || board.archivedAt) {
      throw new ApiError(404, "BOARD_NOT_FOUND", "Board not found");
    }

    const membership = await boardsRepo.isBoardMember(boardId, userId);
    if (!membership || (membership.role !== "OWNER" && membership.role !== "ADMIN")) {
      throw new ApiError(403, "BOARD_FORBIDDEN", "Only board OWNER/ADMIN can access analytics");
    }

    let fromDate: Date | null = parseDateArg(query.from);
    let toDate: Date | null = parseDateArg(query.to);

    if (!fromDate || !toDate) {
      const range = query.range ?? "30d";
      const days = range === "7d" ? 7 : range === "30d" ? 30 : range === "90d" ? 90 : 365;
      const end = startOfDayUtc(new Date());
      fromDate = addDaysUtc(end, -days);
      toDate = end;
    }

    // Cache-aside: board analytics is read-heavy and changes only when rollups run.
    // Authz is checked above, so cache key doesn't need userId.
    const fromYmd = toYmd(fromDate);
    const toYmdStr = toYmd(toDate);
    const boardVer = await getAnalyticsCacheVersion(boardId);
    const cacheKeyStr = cacheKey(
      "analytics",
      "board",
      boardId,
      "from",
      fromYmd,
      "to",
      toYmdStr,
      "ver",
      String(boardVer),
    );

    const cached = await cacheGetJson<{
      range: { from: string; to: string };
      daily: any[];
      summary: any;
    }>(cacheKeyStr);

    if (cached) return cached;

    const daily = await prisma.board_metrics_daily.findMany({
      where: {
        boardId,
        date: { gte: fromDate, lt: toDate },
      },
      orderBy: { date: "asc" },
    });

    const summary = {
      cardsCreatedCount: daily.reduce((sum, r) => sum + r.cardsCreatedCount, 0),
      cardsDoneCount: daily.reduce((sum, r) => sum + r.cardsDoneCount, 0),
      cardsMovedCount: daily.reduce((sum, r) => sum + r.cardsMovedCount, 0),
      commentsCount: daily.reduce((sum, r) => sum + r.commentsCount, 0),
      attachmentsCount: daily.reduce((sum, r) => sum + r.attachmentsCount, 0),
      assigneesAddedCount: daily.reduce((sum, r) => sum + r.assigneesAddedCount, 0),
      assigneesRemovedCount: daily.reduce((sum, r) => sum + r.assigneesRemovedCount, 0),
      avgCycleTimeSec: average(daily.map((r) => r.avgCycleTimeSec)),
      avgLeadTimeSec: average(daily.map((r) => r.avgLeadTimeSec)),
      latestWipCount: daily.length ? daily[daily.length - 1]!.wipCount : 0,
      latestOverdueCount: daily.length ? daily[daily.length - 1]!.overdueCount : 0,
    };

    const response = {
      range: { from: fromDate.toISOString().slice(0, 10), to: toDate.toISOString().slice(0, 10) },
      daily,
      summary,
    };

    await cacheSetJson(cacheKeyStr, response, env.CACHE_ANALYTICS_TTL_SEC);
    return response;
  }

  async getWorkspaceAnalytics(userId: string, workspaceId: string) {
    const membership = await workspacesRepo.findMembership(workspaceId, userId);
    if (!membership || (membership.role !== "OWNER" && membership.role !== "ADMIN")) {
      throw new ApiError(403, "WORKSPACE_FORBIDDEN", "Only workspace OWNER/ADMIN can access analytics");
    }

    const workspace = await prisma.workspaces.findUnique({
      where: { id: workspaceId },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, displayName: true, email: true, avatarUrl: true },
            },
          },
        },
        boards: {
          where: { archivedAt: null },
          include: {
            lists: {
              where: { archivedAt: null },
              include: {
                cards: {
                  where: { archivedAt: null },
                  include: {
                    assignees: {
                      include: {
                        user: { select: { id: true, displayName: true, email: true, avatarUrl: true } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!workspace) throw new ApiError(404, "WORKSPACE_NOT_FOUND", "Workspace not found");

    let totalCards = 0;
    let completedCards = 0;
    let overdueCards = 0;
    let totalEstimatedHours = 0;
    let totalLoggedSeconds = 0;

    const now = new Date();

    const boardStats = workspace.boards.map((b) => {
      let bCards = 0;
      let bDone = 0;
      let bOverdue = 0;
      let bEstimated = 0;
      let bLogged = 0;

      b.lists.forEach((l) => {
        l.cards.forEach((c) => {
          bCards++;
          if (c.isDone) bDone++;
          if (c.dueAt && new Date(c.dueAt) < now && !c.isDone) bOverdue++;
          if (c.estimatedHours) bEstimated += c.estimatedHours;
          if (c.loggedSeconds) bLogged += c.loggedSeconds;
        });
      });

      totalCards += bCards;
      completedCards += bDone;
      overdueCards += bOverdue;
      totalEstimatedHours += bEstimated;
      totalLoggedSeconds += bLogged;

      return {
        id: b.id,
        name: b.name,
        totalCards: bCards,
        completedCards: bDone,
        overdueCards: bOverdue,
        estimatedHours: bEstimated,
        loggedHours: +(bLogged / 3600).toFixed(1),
        completionRate: bCards > 0 ? +((bDone / bCards) * 100).toFixed(0) : 0,
      };
    });

    const memberStatsMap: Record<string, { user: any; assignedCards: number; completedCards: number; loggedHours: number }> = {};

    workspace.members.forEach((m) => {
      memberStatsMap[m.userId] = {
        user: m.user,
        assignedCards: 0,
        completedCards: 0,
        loggedHours: 0,
      };
    });

    workspace.boards.forEach((b) => {
      b.lists.forEach((l) => {
        l.cards.forEach((c) => {
          c.assignees.forEach((a) => {
            if (!memberStatsMap[a.userId]) {
              memberStatsMap[a.userId] = {
                user: a.user,
                assignedCards: 0,
                completedCards: 0,
                loggedHours: 0,
              };
            }
            memberStatsMap[a.userId].assignedCards++;
            if (c.isDone) memberStatsMap[a.userId].completedCards++;
            if (c.loggedSeconds) memberStatsMap[a.userId].loggedHours += c.loggedSeconds / 3600;
          });
        });
      });
    });

    const memberStats = Object.values(memberStatsMap).map((ms) => ({
      ...ms,
      loggedHours: +ms.loggedHours.toFixed(1),
    }));

    return {
      workspace: { id: workspace.id, name: workspace.name },
      kpis: {
        totalBoards: workspace.boards.length,
        totalCards,
        completedCards,
        overdueCards,
        completionRate: totalCards > 0 ? +((completedCards / totalCards) * 100).toFixed(0) : 0,
        totalEstimatedHours: +totalEstimatedHours.toFixed(1),
        totalLoggedHours: +(totalLoggedSeconds / 3600).toFixed(1),
      },
      boardStats,
      memberStats,
    };
  }
}

export const analyticsService = new AnalyticsService();
