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

	let port = env.SMTP_PORT!;
	let secure = env.SMTP_PORT === 465 || env.SMTP_SECURE === true;

	// Automatically upgrade Gmail SMTP from blocked port 587 to SSL port 465 on cloud environments
	if (env.SMTP_HOST === 'smtp.gmail.com' && port === 587) {
		port = 465;
		secure = true;
	}

	return {
		host: env.SMTP_HOST!,
		port,
		secure,
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

async function sendMailWithFallback(options: {
	to: string;
	subject: string;
	text: string;
	html: string;
}) {
	const cfg = requireSmtpConfig();
	console.log(`[mailer] Sending email to ${options.to} via SMTP ${cfg.host}:${cfg.port}...`);
	const info = await getTransporter().sendMail({
		from: cfg.from,
		to: options.to,
		subject: options.subject,
		text: options.text,
		html: options.html,
	});
	console.log(`[mailer] Email sent successfully via Nodemailer SMTP! messageId=${info.messageId}`);
	return info;
}

export async function sendReminderEmail(params: {
	to: string;
	workspaceName: string;
	boardName: string;
	cardTitle: string;
	dueAt: Date | null;
}) {
	const { subject, text, html } = buildReminderEmail({
		workspaceName: params.workspaceName,
		boardName: params.boardName,
		cardTitle: params.cardTitle,
		dueAt: params.dueAt,
	});

	try {
		return await sendMailWithFallback({
			to: params.to,
			subject,
			text,
			html,
		});
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
	const { subject, text, html } = buildPasswordResetEmail({
		email: params.email,
		resetUrl: params.resetUrl,
		expiresAt: params.expiresAt,
	});

	try {
		return await sendMailWithFallback({
			to: params.to,
			subject,
			text,
			html,
		});
	} catch (err) {
		console.error(`[mailer] Failed to send password reset email to ${params.to}:`, err);
		throw err;
	}
}
