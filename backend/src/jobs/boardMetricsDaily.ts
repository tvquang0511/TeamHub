import { activity_type } from "@prisma/client";

import prisma from "../db/prisma";

const DEFAULT_RETENTION_DAYS = 90;

const startOfDayUtc = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
const addDaysUtc = (d: Date, days: number) => new Date(d.getTime() + days * 24 * 60 * 60 * 1000);
const startOfNextMonthUtc = (monthStart: Date) =>
  new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 1));

const parseDateArg = (arg?: string) => {
  if (!arg) return null;
  const parts = arg.split("-").map((p) => Number(p));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null;
  const [y, m, day] = parts;
  return new Date(Date.UTC(y, m - 1, day));
};

const average = (values: number[]) => {
  if (!values.length) return null;
  const total = values.reduce((sum, v) => sum + v, 0);
  return Math.round(total / values.length);
};

const countByType = (items: Array<{ type: activity_type }>, type: activity_type) =>
  items.reduce((sum, item) => sum + (item.type === type ? 1 : 0), 0);

const getPayload = (payload: unknown) => (payload && typeof payload === "object" ? (payload as any) : {});

async function upsertMonthly(boardId: string, monthStart: Date) {
  const monthEnd = startOfNextMonthUtc(monthStart);
  const daily = await prisma.board_metrics_daily.findMany({
    where: {
      boardId,
      date: { gte: monthStart, lt: monthEnd },
    },
    select: {
      cardsCreatedCount: true,
      cardsDoneCount: true,
      cardsMovedCount: true,
      commentsCount: true,
      attachmentsCount: true,
      assigneesAddedCount: true,
      assigneesRemovedCount: true,
      avgCycleTimeSec: true,
      avgLeadTimeSec: true,
    },
  });

  const total = daily.reduce(
    (acc, row) => {
      acc.cardsCreatedCount += row.cardsCreatedCount;
      acc.cardsDoneCount += row.cardsDoneCount;
      acc.cardsMovedCount += row.cardsMovedCount;
      acc.commentsCount += row.commentsCount;
      acc.attachmentsCount += row.attachmentsCount;
      acc.assigneesAddedCount += row.assigneesAddedCount;
      acc.assigneesRemovedCount += row.assigneesRemovedCount;
      if (row.avgCycleTimeSec) acc.cycleTimes.push(row.avgCycleTimeSec);
      if (row.avgLeadTimeSec) acc.leadTimes.push(row.avgLeadTimeSec);
      return acc;
    },
    {
      cardsCreatedCount: 0,
      cardsDoneCount: 0,
      cardsMovedCount: 0,
      commentsCount: 0,
      attachmentsCount: 0,
      assigneesAddedCount: 0,
      assigneesRemovedCount: 0,
      cycleTimes: [] as number[],
      leadTimes: [] as number[],
    },
  );

  await prisma.board_metrics_monthly.upsert({
    where: { boardId_month: { boardId, month: monthStart } },
    create: {
      boardId,
      month: monthStart,
      cardsCreatedCount: total.cardsCreatedCount,
      cardsDoneCount: total.cardsDoneCount,
      cardsMovedCount: total.cardsMovedCount,
      commentsCount: total.commentsCount,
      attachmentsCount: total.attachmentsCount,
      assigneesAddedCount: total.assigneesAddedCount,
      assigneesRemovedCount: total.assigneesRemovedCount,
      avgCycleTimeSec: average(total.cycleTimes),
      avgLeadTimeSec: average(total.leadTimes),
    },
    update: {
      cardsCreatedCount: total.cardsCreatedCount,
      cardsDoneCount: total.cardsDoneCount,
      cardsMovedCount: total.cardsMovedCount,
      commentsCount: total.commentsCount,
      attachmentsCount: total.attachmentsCount,
      assigneesAddedCount: total.assigneesAddedCount,
      assigneesRemovedCount: total.assigneesRemovedCount,
      avgCycleTimeSec: average(total.cycleTimes),
      avgLeadTimeSec: average(total.leadTimes),
    },
  });
}

export async function runBoardMetricsDailyRollup(dateArg?: string) {
  const targetDate = parseDateArg(dateArg) ?? startOfDayUtc(addDaysUtc(new Date(), -1));
  const dayStart = startOfDayUtc(targetDate);
  const dayEnd = addDaysUtc(dayStart, 1);

  const boards = await prisma.boards.findMany({
    where: { archivedAt: null },
    select: { id: true },
  });

  for (const board of boards) {
    const lists = await prisma.lists.findMany({
      where: { boardId: board.id, archivedAt: null },
      select: { id: true, isDoing: true, isDone: true },
    });

    const doingListIds = lists.filter((l) => l.isDoing).map((l) => l.id);
    const doneListIds = lists.filter((l) => l.isDone).map((l) => l.id);

    const events = await prisma.activities.findMany({
      where: {
        boardId: board.id,
        createdAt: { gte: dayStart, lt: dayEnd },
        type: {
          in: [
            activity_type.CARD_CREATED,
            activity_type.CARD_MOVED,
            activity_type.CARD_UPDATED,
            activity_type.COMMENT_ADDED,
            activity_type.ATTACHMENT_ADDED,
            activity_type.ASSIGNEE_ADDED,
            activity_type.ASSIGNEE_REMOVED,
          ],
        },
      },
      select: { type: true, payload: true, cardId: true, createdAt: true },
    });

    const doneCardTime = new Map<string, Date>();
    for (const e of events) {
      const payload = getPayload(e.payload);
      if (e.type === activity_type.CARD_UPDATED && payload.field === "isDone" && payload.to === true) {
        if (e.cardId) {
          const prev = doneCardTime.get(e.cardId);
          if (!prev || e.createdAt > prev) doneCardTime.set(e.cardId, e.createdAt);
        }
      }

      if (e.type === activity_type.CARD_MOVED && e.cardId && doneListIds.length) {
        if (doneListIds.includes(payload.toListId)) {
          const prev = doneCardTime.get(e.cardId);
          if (!prev || e.createdAt > prev) doneCardTime.set(e.cardId, e.createdAt);
        }
      }
    }

    const doneCardIds = Array.from(doneCardTime.keys());

    const cardsForLead = doneCardIds.length
      ? await prisma.cards.findMany({
          where: { id: { in: doneCardIds } },
          select: { id: true, createdAt: true },
        })
      : [];

    const leadTimes: number[] = [];
    for (const card of cardsForLead) {
      const doneAt = doneCardTime.get(card.id);
      if (!doneAt) continue;
      leadTimes.push(Math.round((doneAt.getTime() - card.createdAt.getTime()) / 1000));
    }

    let cycleTimes: number[] = [];
    if (doingListIds.length && doneCardIds.length) {
      const moveEvents = await prisma.activities.findMany({
        where: {
          cardId: { in: doneCardIds },
          type: activity_type.CARD_MOVED,
          createdAt: { lt: dayEnd },
        },
        select: { cardId: true, createdAt: true, payload: true },
      });

      const firstDoing = new Map<string, Date>();
      for (const e of moveEvents) {
        if (!e.cardId) continue;
        const payload = getPayload(e.payload);
        if (!doingListIds.includes(payload.toListId)) continue;
        const existing = firstDoing.get(e.cardId);
        if (!existing || e.createdAt < existing) firstDoing.set(e.cardId, e.createdAt);
      }

      cycleTimes = doneCardIds
        .map((cardId) => {
          const doneAt = doneCardTime.get(cardId);
          const startedAt = firstDoing.get(cardId);
          if (!doneAt || !startedAt) return null;
          return Math.round((doneAt.getTime() - startedAt.getTime()) / 1000);
        })
        .filter((v): v is number => v !== null && v >= 0);
    }

    const wipCount = doingListIds.length
      ? await prisma.cards.count({
          where: {
            archivedAt: null,
            listId: { in: doingListIds },
            list: { archivedAt: null, boardId: board.id },
          },
        })
      : await prisma.cards.count({
          where: {
            archivedAt: null,
            isDone: false,
            list: { archivedAt: null, boardId: board.id },
          },
        });

    const overdueCount = await prisma.cards.count({
      where: {
        archivedAt: null,
        isDone: false,
        dueAt: { lt: dayEnd },
        list: { archivedAt: null, boardId: board.id },
      },
    });

    await prisma.board_metrics_daily.upsert({
      where: { boardId_date: { boardId: board.id, date: dayStart } },
      create: {
        boardId: board.id,
        date: dayStart,
        cardsCreatedCount: countByType(events, activity_type.CARD_CREATED),
        cardsDoneCount: doneCardIds.length,
        cardsMovedCount: countByType(events, activity_type.CARD_MOVED),
        commentsCount: countByType(events, activity_type.COMMENT_ADDED),
        attachmentsCount: countByType(events, activity_type.ATTACHMENT_ADDED),
        assigneesAddedCount: countByType(events, activity_type.ASSIGNEE_ADDED),
        assigneesRemovedCount: countByType(events, activity_type.ASSIGNEE_REMOVED),
        wipCount,
        overdueCount,
        avgCycleTimeSec: average(cycleTimes),
        avgLeadTimeSec: average(leadTimes),
      },
      update: {
        cardsCreatedCount: countByType(events, activity_type.CARD_CREATED),
        cardsDoneCount: doneCardIds.length,
        cardsMovedCount: countByType(events, activity_type.CARD_MOVED),
        commentsCount: countByType(events, activity_type.COMMENT_ADDED),
        attachmentsCount: countByType(events, activity_type.ATTACHMENT_ADDED),
        assigneesAddedCount: countByType(events, activity_type.ASSIGNEE_ADDED),
        assigneesRemovedCount: countByType(events, activity_type.ASSIGNEE_REMOVED),
        wipCount,
        overdueCount,
        avgCycleTimeSec: average(cycleTimes),
        avgLeadTimeSec: average(leadTimes),
      },
    });

    const monthStart = new Date(Date.UTC(dayStart.getUTCFullYear(), dayStart.getUTCMonth(), 1));
    await upsertMonthly(board.id, monthStart);
  }
}

export async function cleanupOldActivities(retentionDays = DEFAULT_RETENTION_DAYS) {
  const cutoff = addDaysUtc(startOfDayUtc(new Date()), -retentionDays);
  await prisma.activities.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });
}

async function main() {
  const dateArg = process.argv[2];
  await runBoardMetricsDailyRollup(dateArg);
  await cleanupOldActivities(Number(process.env.ACTIVITY_RETENTION_DAYS ?? DEFAULT_RETENTION_DAYS));
}

if (require.main === module) {
  main()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
