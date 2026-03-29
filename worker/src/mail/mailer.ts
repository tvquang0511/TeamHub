import env from '../config/env';
import { buildReminderEmail } from './templates/reminder';

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
		secure: env.SMTP_SECURE ?? (env.SMTP_PORT === 465),
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

	await getTransporter().sendMail({
		from: cfg.from,
		to: params.to,
		subject,
		text,
		html,
	});
}
