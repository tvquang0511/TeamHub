import { Queue } from 'bullmq';
import IORedis from 'ioredis';

import env from '../../config/env';

export const EMAILS_QUEUE_NAME = 'emails';
export const EMAILS_JOB_PASSWORD_RESET = 'password_reset';

export type PasswordResetEmailJobData = {
	type: 'password_reset';
	to: string;
	email: string;
	resetUrl: string;
	expiresAtIso: string;
};

let _queue: Queue | null = null;

function getEmailsQueue(): Queue {
	if (_queue) return _queue;

	const connection = new IORedis(env.REDIS_URL, {
		maxRetriesPerRequest: null,
	});

	_queue = new Queue(EMAILS_QUEUE_NAME, {
		connection,
		defaultJobOptions: {
			removeOnComplete: true,
			removeOnFail: 1000,
		},
	});

	return _queue;
}

export async function enqueuePasswordResetEmailJob(data: Omit<PasswordResetEmailJobData, 'type'>) {
	await getEmailsQueue().add(
		EMAILS_JOB_PASSWORD_RESET,
		{ type: 'password_reset', ...data } satisfies PasswordResetEmailJobData,
		{
			attempts: 3,
			backoff: { type: 'exponential', delay: 10_000 },
		},
	);
}
