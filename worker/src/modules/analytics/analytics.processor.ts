import type { PoolClient } from "pg";

const DEFAULT_RETENTION_DAYS = 90;

type ActivityRow = {
  type: string;
  payload: any;
  card_id: string | null;
  created_at: Date;
};

const startOfDayUtc = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
const addDaysUtc = (d: Date, days: number) => new Date(d.getTime() + days * 24 * 60 * 60 * 1000);
const startOfNextMonthUtc = (monthStart: Date) =>
  new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 1));

const parseDateArg = (arg?: string) => {
  if (!arg) return null;
  const parts = arg.split("-").map((p) => Number(p));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null;
  const y = parts[0]!;
  const m = parts[1]!;
  const day = parts[2]!;
  return new Date(Date.UTC(y, m - 1, day));
};

const average = (values: number[]) => {
  if (!values.length) return null;
  const total = values.reduce((sum, v) => sum + v, 0);
  return Math.round(total / values.length);
};

const countByType = (items: ActivityRow[], type: string) =>
  items.reduce((sum, item) => sum + (item.type === type ? 1 : 0), 0);

export async function processBoardMetricsDailyJob(
  client: PoolClient,
  dateArg?: string,
  retentionDays = DEFAULT_RETENTION_DAYS,
) {
  const targetDate = parseDateArg(dateArg) ?? startOfDayUtc(addDaysUtc(new Date(), -1));
  const dayStart = startOfDayUtc(targetDate);
  const dayEnd = addDaysUtc(dayStart, 1);

  const boardsResult = await client.query<{ id: string }>(
    "SELECT id FROM boards WHERE archived_at IS NULL",
  );

  for (const board of boardsResult.rows) {
    const listsResult = await client.query<{
      id: string;
      is_doing: boolean;
      is_done: boolean;
    }>(
      "SELECT id, is_doing, is_done FROM lists WHERE board_id = $1 AND archived_at IS NULL",
      [board.id],
    );

    const doingListIds = listsResult.rows.filter((l) => l.is_doing).map((l) => l.id);
    const doneListIds = listsResult.rows.filter((l) => l.is_done).map((l) => l.id);

    const eventsResult = await client.query<ActivityRow>(
      `SELECT type, payload, card_id, created_at
       FROM activities
       WHERE board_id = $1
         AND created_at >= $2
         AND created_at < $3
         AND type = ANY($4::activity_type[])`,
      [
        board.id,
        dayStart,
        dayEnd,
        [
          "CARD_CREATED",
          "CARD_MOVED",
          "CARD_UPDATED",
          "COMMENT_ADDED",
          "ATTACHMENT_ADDED",
          "ASSIGNEE_ADDED",
          "ASSIGNEE_REMOVED",
        ],
      ],
    );

    const events = eventsResult.rows;

    const doneCardTime = new Map<string, Date>();
    for (const e of events) {
      const payload = e.payload || {};
      if (e.type === "CARD_UPDATED" && payload.field === "isDone" && payload.to === true) {
        if (e.card_id) {
          const prev = doneCardTime.get(e.card_id);
          if (!prev || e.created_at > prev) doneCardTime.set(e.card_id, e.created_at);
        }
      }

      if (e.type === "CARD_MOVED" && e.card_id && doneListIds.length) {
        if (doneListIds.includes(payload.toListId)) {
          const prev = doneCardTime.get(e.card_id);
          if (!prev || e.created_at > prev) doneCardTime.set(e.card_id, e.created_at);
        }
      }
    }

    const doneCardIds = Array.from(doneCardTime.keys());

    let leadTimes: number[] = [];
    if (doneCardIds.length) {
      const cardsResult = await client.query<{ id: string; created_at: Date }>(
        "SELECT id, created_at FROM cards WHERE id = ANY($1::uuid[])",
        [doneCardIds],
      );

      leadTimes = cardsResult.rows
        .map((c) => {
          const doneAt = doneCardTime.get(c.id);
          if (!doneAt) return null;
          return Math.round((doneAt.getTime() - c.created_at.getTime()) / 1000);
        })
        .filter((v): v is number => v !== null && v >= 0);
    }

    let cycleTimes: number[] = [];
    if (doingListIds.length && doneCardIds.length) {
      const movesResult = await client.query<ActivityRow>(
        `SELECT card_id, payload, created_at
         FROM activities
         WHERE card_id = ANY($1::uuid[])
           AND type = 'CARD_MOVED'
           AND created_at < $2`,
        [doneCardIds, dayEnd],
      );

      const firstDoing = new Map<string, Date>();
      for (const e of movesResult.rows) {
        const payload = e.payload || {};
        if (!doingListIds.includes(payload.toListId)) continue;
        const existing = firstDoing.get(e.card_id!);
        if (!existing || e.created_at < existing) firstDoing.set(e.card_id!, e.created_at);
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

    let wipCount = 0;
    if (doingListIds.length) {
      const wipResult = await client.query<{ count: string }>(
        `SELECT COUNT(*) AS count
         FROM cards c
         JOIN lists l ON l.id = c.list_id
         WHERE c.archived_at IS NULL
           AND l.archived_at IS NULL
           AND l.board_id = $1
           AND c.list_id = ANY($2::uuid[])`,
        [board.id, doingListIds],
      );
      wipCount = Number(wipResult.rows[0]?.count ?? 0);
    } else {
      const wipResult = await client.query<{ count: string }>(
        `SELECT COUNT(*) AS count
         FROM cards c
         JOIN lists l ON l.id = c.list_id
         WHERE c.archived_at IS NULL
           AND l.archived_at IS NULL
           AND l.board_id = $1
           AND c.is_done = false`,
        [board.id],
      );
      wipCount = Number(wipResult.rows[0]?.count ?? 0);
    }

    const overdueResult = await client.query<{ count: string }>(
      `SELECT COUNT(*) AS count
       FROM cards c
       JOIN lists l ON l.id = c.list_id
       WHERE c.archived_at IS NULL
         AND l.archived_at IS NULL
         AND l.board_id = $1
         AND c.is_done = false
         AND c.due_at < $2`,
      [board.id, dayEnd],
    );
    const overdueCount = Number(overdueResult.rows[0]?.count ?? 0);

    await client.query(
      `INSERT INTO board_metrics_daily (
         board_id, date,
         cards_created_count, cards_done_count, cards_moved_count,
         comments_count, attachments_count,
         assignees_added_count, assignees_removed_count,
         wip_count, overdue_count,
         avg_cycle_time_sec, avg_lead_time_sec
       ) VALUES (
         $1, $2,
         $3, $4, $5,
         $6, $7,
         $8, $9,
         $10, $11,
         $12, $13
       )
       ON CONFLICT (board_id, date) DO UPDATE SET
         cards_created_count = EXCLUDED.cards_created_count,
         cards_done_count = EXCLUDED.cards_done_count,
         cards_moved_count = EXCLUDED.cards_moved_count,
         comments_count = EXCLUDED.comments_count,
         attachments_count = EXCLUDED.attachments_count,
         assignees_added_count = EXCLUDED.assignees_added_count,
         assignees_removed_count = EXCLUDED.assignees_removed_count,
         wip_count = EXCLUDED.wip_count,
         overdue_count = EXCLUDED.overdue_count,
         avg_cycle_time_sec = EXCLUDED.avg_cycle_time_sec,
         avg_lead_time_sec = EXCLUDED.avg_lead_time_sec,
         updated_at = NOW()`,
      [
        board.id,
        dayStart,
        countByType(events, "CARD_CREATED"),
        doneCardIds.length,
        countByType(events, "CARD_MOVED"),
        countByType(events, "COMMENT_ADDED"),
        countByType(events, "ATTACHMENT_ADDED"),
        countByType(events, "ASSIGNEE_ADDED"),
        countByType(events, "ASSIGNEE_REMOVED"),
        wipCount,
        overdueCount,
        average(cycleTimes),
        average(leadTimes),
      ],
    );

    const monthStart = new Date(Date.UTC(dayStart.getUTCFullYear(), dayStart.getUTCMonth(), 1));
    const monthEnd = startOfNextMonthUtc(monthStart);

    await client.query(
      `INSERT INTO board_metrics_monthly (
         board_id, month,
         cards_created_count, cards_done_count, cards_moved_count,
         comments_count, attachments_count,
         assignees_added_count, assignees_removed_count,
         avg_cycle_time_sec, avg_lead_time_sec
       )
       SELECT
         $1 AS board_id,
         $2 AS month,
         COALESCE(SUM(cards_created_count), 0),
         COALESCE(SUM(cards_done_count), 0),
         COALESCE(SUM(cards_moved_count), 0),
         COALESCE(SUM(comments_count), 0),
         COALESCE(SUM(attachments_count), 0),
         COALESCE(SUM(assignees_added_count), 0),
         COALESCE(SUM(assignees_removed_count), 0),
         ROUND(AVG(avg_cycle_time_sec))::int,
         ROUND(AVG(avg_lead_time_sec))::int
       FROM board_metrics_daily
       WHERE board_id = $1 AND date >= $2 AND date < $3
       ON CONFLICT (board_id, month) DO UPDATE SET
         cards_created_count = EXCLUDED.cards_created_count,
         cards_done_count = EXCLUDED.cards_done_count,
         cards_moved_count = EXCLUDED.cards_moved_count,
         comments_count = EXCLUDED.comments_count,
         attachments_count = EXCLUDED.attachments_count,
         assignees_added_count = EXCLUDED.assignees_added_count,
         assignees_removed_count = EXCLUDED.assignees_removed_count,
         avg_cycle_time_sec = EXCLUDED.avg_cycle_time_sec,
         avg_lead_time_sec = EXCLUDED.avg_lead_time_sec,
         updated_at = NOW()`,
      [board.id, monthStart, monthEnd],
    );
  }

  const cutoff = addDaysUtc(startOfDayUtc(new Date()), -retentionDays);
  await client.query("DELETE FROM activities WHERE created_at < $1", [cutoff]);
}
