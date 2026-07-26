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
	if (env.MAILTRAP_TOKEN && env.MAILTRAP_TOKEN.trim()) {
		console.log(`[mailer] Sending email to ${options.to} via Mailtrap HTTP API (Port 443)...`);
		const res = await fetch('https://send.api.mailtrap.io/api/send', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${env.MAILTRAP_TOKEN.trim()}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				from: { email: 'hello@demomailtrap.com', name: 'TeamHub' },
				to: [{ email: options.to }],
				subject: options.subject,
				text: options.text,
				html: options.html,
			}),
		});

		const data = (await res.json()) as any;
		if (!res.ok) {
			throw new Error(`Mailtrap API Error (${res.status}): ${JSON.stringify(data)}`);
		}
		console.log(`[mailer] Email sent successfully via Mailtrap API! message_ids=${JSON.stringify(data.message_ids)}`);
		return data;
	}

	if (env.BREVO_API_KEY && env.BREVO_API_KEY.trim()) {
		console.log(`[mailer] Sending email to ${options.to} via Brevo HTTP API (Port 443)...`);
		const senderEmail = env.SMTP_USER || 'tvquang.working@gmail.com';
		const res = await fetch('https://api.brevo.com/v3/smtp/email', {
			method: 'POST',
			headers: {
				'api-key': env.BREVO_API_KEY.trim(),
				'Content-Type': 'application/json',
				Accept: 'application/json',
			},
			body: JSON.stringify({
				sender: { name: 'TeamHub', email: senderEmail },
				to: [{ email: options.to }],
				subject: options.subject,
				htmlContent: options.html,
				textContent: options.text,
			}),
		});

		const data = (await res.json()) as any;
		if (!res.ok) {
			throw new Error(`Brevo API Error (${res.status}): ${JSON.stringify(data)}`);
		}
		console.log(`[mailer] Email sent successfully via Brevo API! messageId=${data.messageId || data.id}`);
		return data;
	}

	if (env.RESEND_API_KEY && env.RESEND_API_KEY.trim()) {
		console.log(`[mailer] Sending email to ${options.to} via Resend HTTP API (Port 443)...`);
		const fromEmail = env.SMTP_FROM && env.SMTP_FROM.includes('@') ? env.SMTP_FROM : 'TeamHub <onboarding@resend.dev>';
		const res = await fetch('https://api.resend.com/emails', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${env.RESEND_API_KEY.trim()}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				from: fromEmail.includes('resend.dev') ? fromEmail : 'TeamHub <onboarding@resend.dev>',
				to: [options.to],
				subject: options.subject,
				text: options.text,
				html: options.html,
			}),
		});

		const data = (await res.json()) as any;
		if (!res.ok) {
			throw new Error(`Resend API Error (${res.status}): ${JSON.stringify(data)}`);
		}
		console.log(`[mailer] Email sent successfully via Resend API! id=${data.id}`);
		return data;
	}

	// Fallback to Nodemailer SMTP
	const cfg = requireSmtpConfig();
	console.log(`[mailer] Sending email to ${options.to} via SMTP ${cfg.host}:${cfg.port}...`);
	const info = await getTransporter().sendMail({
		from: cfg.from,
		to: options.to,
		subject: options.subject,
		text: options.text,
		html: options.html,
	});
	console.log(`[mailer] Email sent successfully via Nodemailer! messageId=${info.messageId}`);
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
