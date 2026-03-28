import { Queue } from 'bullmq';
import IORedis from 'ioredis';

import env from '../../config/env';

export const REMINDERS_QUEUE_NAME = 'reminders';
export const REMINDERS_JOB_NAME = 'send';

let _queue: Queue | null = null;

function getRemindersQueue(): Queue {
  if (_queue) return _queue;

  const connection = new IORedis(env.REDIS_URL, {
    // Recommended for BullMQ usage.
    maxRetriesPerRequest: null,
  });

  _queue = new Queue(REMINDERS_QUEUE_NAME, {
    connection,
    defaultJobOptions: {
      removeOnComplete: true,
      removeOnFail: 1000,
    },
  });

  return _queue;
}

export async function enqueueReminderJob(params: { reminderJobId: string; remindAt: Date }) {
  const delayMs = Math.max(0, params.remindAt.getTime() - Date.now());

  await getRemindersQueue().add(
    REMINDERS_JOB_NAME,
    { reminderJobId: params.reminderJobId },
    {
      jobId: params.reminderJobId,
      delay: delayMs,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 10_000,
      },
    },
  );
}

export async function removeReminderJob(reminderJobId: string) {
  // BullMQ uses jobId as a string; we set it to reminderJobId.
  try {
    await getRemindersQueue().remove(reminderJobId);
  } catch {
    // Idempotent: if it's already gone, ignore.
  }
}
