import { Queue } from 'bullmq';

import { getQueueConnection } from './connection';

export const EMAILS_QUEUE_NAME = 'notifications';
export const EMAILS_JOB_PASSWORD_RESET = 'password_reset';
export const EMAILS_JOB_EMAIL_VERIFICATION = 'email_verification';

export type PasswordResetEmailJobData = {
	type: 'password_reset';
	to: string;
	email: string;
	resetUrl: string;
	expiresAtIso: string;
};

export type EmailVerificationJobData = {
	type: 'email_verification';
	to: string;
	email: string;
	verificationUrl: string;
	expiresAtIso: string;
};

let _queue: Queue | null = null;

function getEmailsQueue(): Queue {
	if (_queue) return _queue;

	_queue = new Queue(EMAILS_QUEUE_NAME, {
		connection: getQueueConnection(),
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

export async function enqueueEmailVerificationJob(data: Omit<EmailVerificationJobData, 'type'>) {
	await getEmailsQueue().add(
		EMAILS_JOB_EMAIL_VERIFICATION,
		{ type: 'email_verification', ...data } satisfies EmailVerificationJobData,
		{
			attempts: 3,
			backoff: { type: 'exponential', delay: 10_000 },
		},
	);
}