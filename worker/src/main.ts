import { Worker } from 'bullmq';
import IORedis from 'ioredis';

import env from './config/env';
import { withClient } from './db/pool';
import { processReminderJob } from './reminder/reminder.processor';

const REMINDERS_QUEUE_NAME = 'reminders';
const REMINDERS_JOB_NAME = 'send';

const connection = new IORedis(env.REDIS_URL, {
	// Recommended for BullMQ usage.
	maxRetriesPerRequest: null,
});

const worker = new Worker(
	REMINDERS_QUEUE_NAME,
	async (job) => {
		if (job.name !== REMINDERS_JOB_NAME) return;

		const reminderJobId = (job.data as any)?.reminderJobId as string | undefined;
		if (!reminderJobId) throw new Error('Missing reminderJobId');

		await withClient(async (client) => processReminderJob(client, reminderJobId));
	},
	{
		connection,
		concurrency: 10,
	},
);

worker.on('completed', (job) => {
	// eslint-disable-next-line no-console
	console.log(`[reminders] completed job ${job.id}`);
});

worker.on('failed', (job, err) => {
	// eslint-disable-next-line no-console
	console.error(`[reminders] failed job ${job?.id}:`, err);
});

// eslint-disable-next-line no-console
console.log(`[worker] listening queue=${REMINDERS_QUEUE_NAME} redis=${env.REDIS_URL}`);
