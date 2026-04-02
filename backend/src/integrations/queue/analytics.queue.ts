import { Queue } from "bullmq";
import IORedis from "ioredis";

import env from "../../config/env";

export const ANALYTICS_QUEUE_NAME = "analytics";
export const ANALYTICS_JOB_DAILY = "board_metrics_daily";

let _queue: Queue | null = null;

function getAnalyticsQueue(): Queue {
  if (_queue) return _queue;

  const connection = new IORedis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
  });

  _queue = new Queue(ANALYTICS_QUEUE_NAME, {
    connection,
    defaultJobOptions: {
      removeOnComplete: true,
      removeOnFail: 1000,
    },
  });

  return _queue;
}

export async function ensureBoardMetricsDailyJob() {
  const queue = getAnalyticsQueue();
  const pattern = "5 0 * * *";
  const tz = "UTC";

  // If a previous version scheduled this job without tz (server-local timezone),
  // it can run at the wrong UTC moment and roll up the wrong day.
  // Remove any old repeatables for the same name/pattern but different tz.
  const repeatables = await queue.getRepeatableJobs();
  for (const r of repeatables as any[]) {
    if (r?.name !== ANALYTICS_JOB_DAILY) continue;
    const cron = r?.pattern ?? r?.cron;
    if (cron !== pattern) continue;
    if ((r?.tz ?? null) === tz) continue;
    if (typeof r?.key === "string") {
      await queue.removeRepeatableByKey(r.key);
    }
  }

  await queue.add(
    ANALYTICS_JOB_DAILY,
    { type: ANALYTICS_JOB_DAILY },
    {
      jobId: ANALYTICS_JOB_DAILY,
      repeat: { pattern, tz },
      attempts: 3,
      backoff: { type: "exponential", delay: 10_000 },
    },
  );
}

export async function enqueueBoardMetricsDailyJob(date?: string) {
  await getAnalyticsQueue().add(
    ANALYTICS_JOB_DAILY,
    { type: ANALYTICS_JOB_DAILY, date },
    {
      attempts: 3,
      backoff: { type: "exponential", delay: 10_000 },
    },
  );
}
