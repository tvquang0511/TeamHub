import { Worker } from 'bullmq';
import IORedis from 'ioredis';

import env from './config/env';
import { withClient } from './db/pool';
import { processReminderJob } from './modules/reminder/reminder.processor';
import { processEmailJob } from './modules/email/email.processor';
import { processBoardMetricsDailyJob } from './modules/analytics/analytics.processor';
import { BLOBS_QUEUE_NAME } from './modules/blobs/blobs.constants';
import { processBlobsJob } from './modules/blobs/blobs.processor';

const REMINDERS_QUEUE_NAME = 'reminders';
const REMINDERS_JOB_NAME = 'send';

const EMAILS_QUEUE_NAME = 'emails';
const ANALYTICS_QUEUE_NAME = 'analytics';
const ANALYTICS_JOB_NAME = 'board_metrics_daily';

const connection = new IORedis(env.REDIS_URL, {
	// Recommended for BullMQ usage.
	maxRetriesPerRequest: null,
});

const RemindersWorker = new Worker(
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

const emailsWorker = new Worker(
	EMAILS_QUEUE_NAME,
	async (job) => {
		await processEmailJob(job.data);
	},
	{
		connection,
		concurrency: 5,
	},
);

const analyticsWorker = new Worker(
	ANALYTICS_QUEUE_NAME,
	async (job) => {
		if (job.name !== ANALYTICS_JOB_NAME) return;

		const dateArg = (job.data as any)?.date as string | undefined;
		const retentionDays = env.ACTIVITY_RETENTION_DAYS ?? 90;

		await withClient(async (client) => processBoardMetricsDailyJob(client, dateArg, retentionDays));
	},
	{
		connection,
		concurrency: 2,
	},
);

const blobsWorker = new Worker(
	BLOBS_QUEUE_NAME,
	async (job) => {
		return await processBlobsJob(job);
	},
	{
		connection,
		concurrency: 5,
	},
);

RemindersWorker.on('completed', (job) => {
	// eslint-disable-next-line no-console
	console.log(`[reminders] completed job ${job.id}`);
});

RemindersWorker.on('failed', (job, err) => {
	// eslint-disable-next-line no-console
	console.error(`[reminders] failed job ${job?.id}:`, err);
});

emailsWorker.on('completed', (job) => {
	// eslint-disable-next-line no-console
	console.log(`[emails] completed job ${job.id}`);
});

emailsWorker.on('failed', (job, err) => {
	// eslint-disable-next-line no-console
	console.error(`[emails] failed job ${job?.id}:`, err);
});

analyticsWorker.on('completed', (job) => {
	// eslint-disable-next-line no-console
	console.log(`[analytics] completed job ${job.id}`);
});

analyticsWorker.on('failed', (job, err) => {
	// eslint-disable-next-line no-console
	console.error(`[analytics] failed job ${job?.id}:`, err);
});

blobsWorker.on('completed', (job) => {
	// eslint-disable-next-line no-console
	console.log(`[blobs] completed job ${job.id}`);
});

blobsWorker.on('failed', (job, err) => {
	// eslint-disable-next-line no-console
	console.error(`[blobs] failed job ${job?.id}:`, err);
});

// eslint-disable-next-line no-console
console.log(
	`[worker] listening queues=${REMINDERS_QUEUE_NAME},${EMAILS_QUEUE_NAME},${ANALYTICS_QUEUE_NAME},${BLOBS_QUEUE_NAME} redis=${env.REDIS_URL}`,
);
