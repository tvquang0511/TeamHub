import env from '../config/env';
import { buildReminderEmail } from './templates/reminder';
import { buildPasswordResetEmail } from './templates/passwordReset';

type AnyTransporter = {
	sendMail: (options: any) => Promise<any>;
};

function loadNodemailer(): any {
	try {
		// eslint-disable-next-line @typescript-eslint/no-var-requires
		return require('nodemailer');
	} catch (e: any) {
		const message = String(e?.message ?? e);
		throw new Error(
			`Missing dependency nodemailer. Run: cd worker && npm install\nOriginal error: ${message}`,
		);
	}
}

function requireSmtpConfig() {
	const missing: string[] = [];

	if (!env.SMTP_HOST) missing.push('SMTP_HOST');
	if (!env.SMTP_PORT) missing.push('SMTP_PORT');
	if (!env.SMTP_FROM) missing.push('SMTP_FROM');

	// Auth is optional (some local SMTP relays don't require it)
	const hasAuthUser = Boolean(env.SMTP_USER);
	const hasAuthPass = Boolean(env.SMTP_PASS);
	if (hasAuthUser !== hasAuthPass) missing.push('SMTP_USER+SMTP_PASS');

	if (missing.length) {
		throw new Error(`SMTP is not configured (${missing.join(', ')})`);
	}

	return {
		host: env.SMTP_HOST!,
		port: env.SMTP_PORT!,
		secure: env.SMTP_PORT === 465 || env.SMTP_SECURE === true,
		from: env.SMTP_FROM!,
		auth:
			env.SMTP_USER && env.SMTP_PASS
				? {
						user: env.SMTP_USER,
						pass: env.SMTP_PASS,
					}
				: undefined,
	};
}

let _transporter: AnyTransporter | null = null;

function getTransporter(): AnyTransporter {
	if (_transporter) return _transporter;
	const cfg = requireSmtpConfig();

	const nodemailer = loadNodemailer();

	_transporter = nodemailer.createTransport({
		host: cfg.host,
		port: cfg.port,
		secure: cfg.secure,
		auth: cfg.auth,
		connectionTimeout: 10000,
		greetingTimeout: 10000,
		socketTimeout: 15000,
		tls: {
			rejectUnauthorized: false,
		},
	});

	return _transporter!;
}

export async function sendReminderEmail(params: {
	to: string;
	workspaceName: string;
	boardName: string;
	cardTitle: string;
	dueAt: Date | null;
}) {
	const cfg = requireSmtpConfig();

	const { subject, text, html } = buildReminderEmail({
		workspaceName: params.workspaceName,
		boardName: params.boardName,
		cardTitle: params.cardTitle,
		dueAt: params.dueAt,
	});

	try {
		console.log(`[mailer] Sending reminder email to ${params.to} via ${cfg.host}:${cfg.port}...`);
		const info = await getTransporter().sendMail({
			from: cfg.from,
			to: params.to,
			subject,
			text,
			html,
		});
		console.log(`[mailer] Reminder email sent successfully! messageId=${info.messageId}`);
		return info;
	} catch (err) {
		console.error(`[mailer] Failed to send reminder email to ${params.to}:`, err);
		throw err;
	}
}

export async function sendPasswordResetEmail(params: {
	to: string;
	email: string;
	resetUrl: string;
	expiresAt: Date;
}) {
	const cfg = requireSmtpConfig();

	const { subject, text, html } = buildPasswordResetEmail({
		email: params.email,
		resetUrl: params.resetUrl,
		expiresAt: params.expiresAt,
	});

	try {
		console.log(`[mailer] Sending password reset email to ${params.to} via ${cfg.host}:${cfg.port}...`);
		const info = await getTransporter().sendMail({
			from: cfg.from,
			to: params.to,
			subject,
			text,
			html,
		});
		console.log(`[mailer] Password reset email sent successfully! messageId=${info.messageId}`);
		return info;
	} catch (err) {
		console.error(`[mailer] Failed to send password reset email to ${params.to}:`, err);
		throw err;
	}
}
