import { Queue } from "bullmq";
import IORedis from "ioredis";

import env from "../../config/env";

export const BLOBS_QUEUE_NAME = "blobs";

export const BLOBS_JOB_DELETE_OBJECT = "delete_object";
export const BLOBS_JOB_SWEEP_ORPHANS = "sweep_orphans";

export type DeleteObjectJobData = {
  type: "delete_object";
  bucket: string;
  objectKey: string;
};

export type SweepOrphansJobData = {
  type: "sweep_orphans";
};

let _queue: Queue | null = null;

function getBlobsQueue(): Queue {
  if (_queue) return _queue;

  const connection = new IORedis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
  });

  _queue = new Queue(BLOBS_QUEUE_NAME, {
    connection,
    defaultJobOptions: {
      removeOnComplete: true,
      removeOnFail: 1000,
    },
  });

  return _queue;
}

export async function enqueueDeleteObject(input: { bucket: string; objectKey: string }) {
  const bucket = String(input.bucket ?? "");
  const objectKey = String(input.objectKey ?? "");
  if (!bucket || !objectKey) return;

  await getBlobsQueue().add(
    BLOBS_JOB_DELETE_OBJECT,
    { type: "delete_object", bucket, objectKey } satisfies DeleteObjectJobData,
    {
      // Idempotency: jobId = bucket/objectKey so repeated deletes collapse.
      jobId: `${bucket}/${objectKey}`,
      delay: env.BLOB_DELETE_DELAY_MS,
      attempts: 10,
      backoff: { type: "exponential", delay: 10_000 },
    },
  );
}

export async function ensureBlobSweeperJob() {
  if (!env.BLOB_SWEEP_ENABLED) return;

  const queue = getBlobsQueue();
  const pattern = env.BLOB_SWEEP_CRON;
  const tz = env.BLOB_SWEEP_TZ;

  // Remove legacy repeatables with same name/pattern but different tz.
  const repeatables = await queue.getRepeatableJobs();
  for (const r of repeatables as any[]) {
    if (r?.name !== BLOBS_JOB_SWEEP_ORPHANS) continue;
    const cron = r?.pattern ?? r?.cron;
    if (cron !== pattern) continue;
    if ((r?.tz ?? null) === tz) continue;
    if (typeof r?.key === "string") {
      await queue.removeRepeatableByKey(r.key);
    }
  }

  await queue.add(
    BLOBS_JOB_SWEEP_ORPHANS,
    { type: "sweep_orphans" } satisfies SweepOrphansJobData,
    {
      jobId: BLOBS_JOB_SWEEP_ORPHANS,
      repeat: { pattern, tz },
      attempts: 3,
      backoff: { type: "exponential", delay: 30_000 },
    },
  );
}
