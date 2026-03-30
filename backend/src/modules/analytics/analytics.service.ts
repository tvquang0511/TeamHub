import { z } from "zod";

import { ApiError } from "../../common/errors/ApiError";
import prisma from "../../db/prisma";
import { boardsRepo } from "../boards/boards.repo";

export const analyticsQuerySchema = z.object({
  range: z.enum(["7d", "30d", "90d", "1y"]).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

const startOfDayUtc = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
const addDaysUtc = (d: Date, days: number) => new Date(d.getTime() + days * 24 * 60 * 60 * 1000);

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

    return {
      range: { from: fromDate.toISOString().slice(0, 10), to: toDate.toISOString().slice(0, 10) },
      daily,
      summary,
    };
  }
}

export const analyticsService = new AnalyticsService();
