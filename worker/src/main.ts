import { createServer } from 'http';
import { Worker } from 'bullmq';
import IORedis from 'ioredis';

import env from './config/env';
import { withClient } from './db/pool';
import { processReminderJob } from './modules/reminder/reminder.processor';
import { processEmailJob } from './modules/email/email.processor';
import { processBoardMetricsDailyJob } from './modules/analytics/analytics.processor';
import { BLOBS_QUEUE_NAME } from './modules/blobs/blobs.constants';
import { processBlobsJob } from './modules/blobs/blobs.processor';

// Dummy HTTP Health Check server to enable FREE Web Service hosting on Render.com
const port = process.env.PORT || 4001;
const httpServer = createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'ok', worker: 'running' }));
});

httpServer.listen(port, () => {
  console.log(`[worker-http] Health check listening on port ${port}`);
});

const NOTIFICATIONS_QUEUE_NAME = 'notifications';
const BACKGROUND_TASKS_QUEUE_NAME = 'background_tasks';

const REMINDERS_JOB_NAME = 'send';
const ANALYTICS_JOB_DAILY = 'board_metrics_daily';
// Note: EMAILS_JOB_PASSWORD_RESET is usually 'password_reset' (passed dynamically in job.name or job.data.type)

const connection = new IORedis(env.REDIS_URL, {
	// Recommended for BullMQ usage.
	maxRetriesPerRequest: null,
});

connection.on('connect', () => {
	console.log(`[redis] Connected to Redis server successfully (${env.REDIS_URL.split('@')[1] || 'localhost'})`);
});

connection.on('error', (err) => {
	console.error(`[redis] Redis Connection Error:`, err);
});

const defaultWorkerOpts = {
	stalledInterval: 300000, // 5 minutes, to prevent aggressive idle Redis command spam
	drainDelay: 15,     // Wait 15 seconds after queue drains to save Upstash command limit
};

const notificationsWorker = new Worker(
	NOTIFICATIONS_QUEUE_NAME,
	async (job) => {
		if (job.name === REMINDERS_JOB_NAME) {
			const reminderJobId = (job.data as any)?.reminderJobId as string | undefined;
			if (!reminderJobId) throw new Error('Missing reminderJobId');
			await withClient(async (client) => processReminderJob(client, reminderJobId));
		} else {
			// Assume it's an email job
			console.log(`[emails] Worker starting to process job id=${job.id}, name=${job.name}`);
			await processEmailJob(job.data);
		}
	},
	{
		connection,
		concurrency: 10,
		...defaultWorkerOpts,
	},
);

const backgroundTasksWorker = new Worker(
	BACKGROUND_TASKS_QUEUE_NAME,
	async (job) => {
		if (job.name === ANALYTICS_JOB_DAILY) {
			const dateArg = (job.data as any)?.date as string | undefined;
			const retentionDays = env.ACTIVITY_RETENTION_DAYS ?? 90;
			await withClient(async (client) => processBoardMetricsDailyJob(client, dateArg, retentionDays));
		} else {
			// Assume it's a blob job (delete_object or sweep_orphans)
			return await processBlobsJob(job);
		}
	},
	{
		connection,
		concurrency: 5,
		...defaultWorkerOpts,
	},
);

notificationsWorker.on('completed', (job) => {
	console.log(`[notifications] completed job ${job.id} (${job.name})`);
});

notificationsWorker.on('failed', (job, err) => {
	console.error(`[notifications] failed job ${job?.id} (${job?.name}):`, err);
});

notificationsWorker.on('error', (err) => {
	console.error(`[notifications] Worker Error:`, err);
});

backgroundTasksWorker.on('completed', (job) => {
	console.log(`[background_tasks] completed job ${job.id} (${job.name})`);
});

backgroundTasksWorker.on('failed', (job, err) => {
	console.error(`[background_tasks] failed job ${job?.id} (${job?.name}):`, err);
});

backgroundTasksWorker.on('error', (err) => {
	console.error(`[background_tasks] Worker Error:`, err);
});

// eslint-disable-next-line no-console
console.log(
	`[worker] listening queues=${NOTIFICATIONS_QUEUE_NAME},${BACKGROUND_TASKS_QUEUE_NAME} redis=${env.REDIS_URL}`,
);
