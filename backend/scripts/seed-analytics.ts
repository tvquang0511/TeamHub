import "dotenv/config";

import bcrypt from "bcrypt";
import { Prisma, activity_type } from "@prisma/client";

import prisma, { disconnectPrisma } from "../src/db/prisma";
import { runBoardMetricsDailyRollup } from "../src/jobs/boardMetricsDaily";

const PASSWORD = "123456";

const startOfDayUtc = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
const addDaysUtc = (d: Date, days: number) => new Date(d.getTime() + days * 24 * 60 * 60 * 1000);
const atUtc = (dayStartUtc: Date, hh: number, mm: number) =>
  new Date(Date.UTC(dayStartUtc.getUTCFullYear(), dayStartUtc.getUTCMonth(), dayStartUtc.getUTCDate(), hh, mm, 0));

const toYmd = (d: Date) => d.toISOString().slice(0, 10);

function intFromEnv(name: string, fallback: number) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const v = Number(raw);
  return Number.isFinite(v) && v > 0 ? Math.floor(v) : fallback;
}

async function ensureUsers() {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  return Promise.all([
    prisma.users.upsert({
      where: { email: "owner@teamhub.local" },
      update: { displayName: "Owner", passwordHash },
      create: { email: "owner@teamhub.local", displayName: "Owner", passwordHash },
    }),
    prisma.users.upsert({
      where: { email: "admin@teamhub.local" },
      update: { displayName: "Admin", passwordHash },
      create: { email: "admin@teamhub.local", displayName: "Admin", passwordHash },
    }),
    prisma.users.upsert({
      where: { email: "member@teamhub.local" },
      update: { displayName: "Member", passwordHash },
      create: { email: "member@teamhub.local", displayName: "Member", passwordHash },
    }),
  ]);
}

async function ensureWorkspace(users: { id: string }[]) {
  const ws =
    (await prisma.workspaces.findFirst({ where: { name: "TeamHub Demo" } })) ??
    (await prisma.workspaces.create({
      data: { name: "TeamHub Demo", description: "Workspace demo cho analytics" },
    }));

  await prisma.workspace_members.upsert({
    where: { workspaceId_userId: { workspaceId: ws.id, userId: users[0]!.id } },
    update: { role: "OWNER" },
    create: { workspaceId: ws.id, userId: users[0]!.id, role: "OWNER" },
  });

  await prisma.workspace_members.upsert({
    where: { workspaceId_userId: { workspaceId: ws.id, userId: users[1]!.id } },
    update: { role: "ADMIN" },
    create: { workspaceId: ws.id, userId: users[1]!.id, role: "ADMIN" },
  });

  await prisma.workspace_members.upsert({
    where: { workspaceId_userId: { workspaceId: ws.id, userId: users[2]!.id } },
    update: { role: "MEMBER" },
    create: { workspaceId: ws.id, userId: users[2]!.id, role: "MEMBER" },
  });

  return ws;
}

async function resetBoardIfNeeded(boardName: string) {
  const reset = process.env.SEED_ANALYTICS_RESET === "1" || process.env.SEED_ANALYTICS_RESET === "true";
  if (!reset) return;

  const existing = await prisma.boards.findFirst({ where: { name: boardName } });
  if (!existing) return;

  // Cascades to lists/cards/activities/metrics tables.
  await prisma.boards.delete({ where: { id: existing.id } });
}

async function ensureBoardAndLists(wsId: string, boardName: string) {
  const board =
    (await prisma.boards.findFirst({ where: { workspaceId: wsId, name: boardName } })) ??
    (await prisma.boards.create({
      data: {
        workspaceId: wsId,
        name: boardName,
        description: "Dữ liệu seed để test thống kê (analytics)",
        visibility: "WORKSPACE",
        position: new Prisma.Decimal(2048),
      },
    }));

  const lists = await prisma.lists.findMany({ where: { boardId: board.id } });

  const ensureList = async (name: string, position: number, flags?: { isDoing?: boolean; isDone?: boolean }) => {
    const existing = lists.find((l) => l.name === name);
    if (existing) {
      return prisma.lists.update({
        where: { id: existing.id },
        data: {
          isDoing: flags?.isDoing ?? existing.isDoing,
          isDone: flags?.isDone ?? existing.isDone,
        },
      });
    }
    return prisma.lists.create({
      data: {
        boardId: board.id,
        name,
        position: new Prisma.Decimal(position),
        isDoing: flags?.isDoing ?? false,
        isDone: flags?.isDone ?? false,
      },
    });
  };

  const backlog = await ensureList("Backlog", 1024);
  const doing = await ensureList("In Progress", 2048, { isDoing: true });
  const done = await ensureList("Done", 3072, { isDone: true });

  return { board, backlog, doing, done };
}

async function ensureBoardMembership(boardId: string, users: { id: string }[]) {
  await prisma.board_members.upsert({
    where: { boardId_userId: { boardId, userId: users[0]!.id } },
    update: { role: "OWNER" },
    create: { boardId, userId: users[0]!.id, role: "OWNER" },
  });

  await prisma.board_members.upsert({
    where: { boardId_userId: { boardId, userId: users[1]!.id } },
    update: { role: "ADMIN" },
    create: { boardId, userId: users[1]!.id, role: "ADMIN" },
  });

  await prisma.board_members.upsert({
    where: { boardId_userId: { boardId, userId: users[2]!.id } },
    update: { role: "MEMBER" },
    create: { boardId, userId: users[2]!.id, role: "MEMBER" },
  });
}

async function createActivity(data: {
  actorId: string;
  workspaceId: string;
  boardId: string;
  cardId?: string | null;
  type: activity_type;
  payload?: any;
  createdAt: Date;
}) {
  await prisma.activities.create({
    data: {
      actorId: data.actorId,
      workspaceId: data.workspaceId,
      boardId: data.boardId,
      cardId: data.cardId ?? null,
      type: data.type,
      payload: data.payload ?? undefined,
      createdAt: data.createdAt,
    },
  });
}

async function seedAnalyticsData(opts: {
  days: number;
  wsId: string;
  boardId: string;
  backlogListId: string;
  doingListId: string;
  doneListId: string;
  actorId: string;
}) {
  // Seed range: last N days, ending yesterday (UTC), so frontend range default (end = today 00:00 UTC) includes all.
  const today = startOfDayUtc(new Date());
  const endDay = addDaysUtc(today, -1);
  const startDay = addDaysUtc(endDay, -(opts.days - 1));

  // Create a few long-living cards to exercise overdue trend.
  // These cards stay not-done to allow overdueCount to grow as dayEnd passes their dueAt.
  for (let i = 0; i < 6; i++) {
    const createdDay = addDaysUtc(startDay, Math.max(0, i - 1));
    const createdAt = atUtc(createdDay, 8, 15);
    const dueAt = atUtc(addDaysUtc(startDay, 4 + i * 3), 12, 0);

    const card = await prisma.cards.create({
      data: {
        listId: opts.doingListId,
        title: `Thẻ quá hạn #${i + 1}`,
        description: "Seed analytics: thẻ này cố tình để quá hạn",
        dueAt,
        isDone: false,
        position: new Prisma.Decimal(10_000 + i),
        createdAt,
      },
    });

    await createActivity({
      actorId: opts.actorId,
      workspaceId: opts.wsId,
      boardId: opts.boardId,
      cardId: card.id,
      type: activity_type.CARD_CREATED,
      payload: { listId: opts.doingListId },
      createdAt,
    });

    await createActivity({
      actorId: opts.actorId,
      workspaceId: opts.wsId,
      boardId: opts.boardId,
      cardId: card.id,
      type: activity_type.CARD_MOVED,
      payload: { fromListId: opts.backlogListId, toListId: opts.doingListId },
      createdAt: atUtc(createdDay, 9, 10),
    });

    // Some daily chatter on overdue cards.
    await createActivity({
      actorId: opts.actorId,
      workspaceId: opts.wsId,
      boardId: opts.boardId,
      cardId: card.id,
      type: activity_type.COMMENT_ADDED,
      payload: { content: "Nhắc nhẹ: sắp tới hạn" },
      createdAt: atUtc(createdDay, 10, 30),
    });
  }

  // For each day, create a handful of cards and activities.
  for (let dayIdx = 0; dayIdx < opts.days; dayIdx++) {
    const day = addDaysUtc(startDay, dayIdx);
    const ymd = toYmd(day);

    const createdCount = 2 + (dayIdx % 4); // 2..5
    const toDoCount = 1 + (dayIdx % 2); // 1..2

    for (let i = 0; i < createdCount; i++) {
      const createdAt = atUtc(day, 9, 0 + i);
      const card = await prisma.cards.create({
        data: {
          listId: i < toDoCount ? opts.backlogListId : opts.doingListId,
          title: `Seed ${ymd} — Thẻ #${i + 1}`,
          description: "Seed analytics: dùng để test biểu đồ và số liệu hằng ngày",
          dueAt: i % 3 === 0 ? atUtc(addDaysUtc(day, 2 + (i % 3)), 12, 0) : null,
          isDone: false,
          position: new Prisma.Decimal(1000 + dayIdx * 100 + i),
          createdAt,
        },
      });

      await createActivity({
        actorId: opts.actorId,
        workspaceId: opts.wsId,
        boardId: opts.boardId,
        cardId: card.id,
        type: activity_type.CARD_CREATED,
        payload: { listId: card.listId },
        createdAt,
      });

      // Move backlog -> doing for most cards, to make cycle time computable.
      const shouldEnterDoing = i >= toDoCount;
      if (shouldEnterDoing) {
        await createActivity({
          actorId: opts.actorId,
          workspaceId: opts.wsId,
          boardId: opts.boardId,
          cardId: card.id,
          type: activity_type.CARD_MOVED,
          payload: { fromListId: opts.backlogListId, toListId: opts.doingListId },
          createdAt: atUtc(day, 10, 10 + i),
        });
      }

      // Comments/attachments/assignees sprinkled.
      if ((dayIdx + i) % 3 === 0) {
        await createActivity({
          actorId: opts.actorId,
          workspaceId: opts.wsId,
          boardId: opts.boardId,
          cardId: card.id,
          type: activity_type.COMMENT_ADDED,
          payload: { content: "Cập nhật tiến độ" },
          createdAt: atUtc(day, 13, 0 + i),
        });
      }

      if ((dayIdx + i) % 4 === 0) {
        await createActivity({
          actorId: opts.actorId,
          workspaceId: opts.wsId,
          boardId: opts.boardId,
          cardId: card.id,
          type: activity_type.ATTACHMENT_ADDED,
          payload: { url: "https://example.com/spec", fileName: "spec.pdf" },
          createdAt: atUtc(day, 14, 10 + i),
        });
      }

      if ((dayIdx + i) % 5 === 0) {
        await createActivity({
          actorId: opts.actorId,
          workspaceId: opts.wsId,
          boardId: opts.boardId,
          cardId: card.id,
          type: activity_type.ASSIGNEE_ADDED,
          payload: { userId: opts.actorId },
          createdAt: atUtc(day, 15, 0 + i),
        });
      }

      // Done events: avoid scheduling into "today" because default analytics API range ends at today 00:00 UTC.
      const isLastSeedDay = ymd === toYmd(endDay);
      const doneMode = (dayIdx + i) % 2 === 0 ? "move" : "update";

      const shouldDoneSameDay = !isLastSeedDay && i % 2 === 0;
      const doneDay = shouldDoneSameDay ? day : addDaysUtc(day, 1);

      if (doneDay <= endDay && i % 3 !== 0) {
        // Ensure doing start exists before done.
        if (!shouldEnterDoing) {
          await prisma.cards.update({ where: { id: card.id }, data: { listId: opts.doingListId } });
          await createActivity({
            actorId: opts.actorId,
            workspaceId: opts.wsId,
            boardId: opts.boardId,
            cardId: card.id,
            type: activity_type.CARD_MOVED,
            payload: { fromListId: opts.backlogListId, toListId: opts.doingListId },
            createdAt: atUtc(day, 11, 20 + i),
          });
        }

        const doneAt = atUtc(doneDay, 16, 20 + i);

        if (doneMode === "move") {
          await createActivity({
            actorId: opts.actorId,
            workspaceId: opts.wsId,
            boardId: opts.boardId,
            cardId: card.id,
            type: activity_type.CARD_MOVED,
            payload: { fromListId: opts.doingListId, toListId: opts.doneListId },
            createdAt: doneAt,
          });
        } else {
          await createActivity({
            actorId: opts.actorId,
            workspaceId: opts.wsId,
            boardId: opts.boardId,
            cardId: card.id,
            type: activity_type.CARD_UPDATED,
            payload: { field: "isDone", from: false, to: true },
            createdAt: doneAt,
          });
        }

        await prisma.cards.update({
          where: { id: card.id },
          data: { listId: opts.doneListId, isDone: true },
        });
      }
    }
  }

  return { startDay, endDay };
}

async function backfillDailyMetrics(startDay: Date, endDay: Date) {
  let d = startOfDayUtc(startDay);
  const end = startOfDayUtc(endDay);

  while (d <= end) {
    await runBoardMetricsDailyRollup(toYmd(d));
    d = addDaysUtc(d, 1);
  }
}

async function main() {
  const days = intFromEnv("ANALYTICS_SEED_DAYS", 30);
  const boardName = process.env.ANALYTICS_SEED_BOARD_NAME ?? "Analytics Seed Board";
  const backfill = process.env.SEED_ANALYTICS_BACKFILL !== "0";

  const users = await ensureUsers();
  const ws = await ensureWorkspace(users);

  await resetBoardIfNeeded(boardName);
  const { board, backlog, doing, done } = await ensureBoardAndLists(ws.id, boardName);
  await ensureBoardMembership(board.id, users);

  // Use Owner as deterministic actor.
  const actorId = users[0]!.id;

  const { startDay, endDay } = await seedAnalyticsData({
    days,
    wsId: ws.id,
    boardId: board.id,
    backlogListId: backlog.id,
    doingListId: doing.id,
    doneListId: done.id,
    actorId,
  });

  if (backfill) {
    await backfillDailyMetrics(startDay, endDay);
  }

  // Output instructions.
  console.log("Seed analytics completed.");
  console.log(`- Workspace: ${ws.name}`);
  console.log(`- Board: ${board.name}`);
  console.log(`- Days seeded: ${days} (UTC), range ${toYmd(startDay)}..${toYmd(endDay)}`);
  console.log("- Users (password 123456): owner@teamhub.local, admin@teamhub.local, member@teamhub.local");
  console.log("- Backfill daily metrics:", backfill ? "ON" : "OFF");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await disconnectPrisma();
  });
