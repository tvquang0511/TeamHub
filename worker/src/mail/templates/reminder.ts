import env from '../../config/env';
import { renderHtmlTemplate } from './render';

export function buildReminderEmail(params: {
	workspaceName: string;
	boardName: string;
	cardTitle: string;
	dueAt: Date | null;
}) {
	const dueAtText = params.dueAt
		? params.dueAt.toLocaleString('vi-VN', {
				timeZone: env.APP_TIMEZONE,
				hour12: false,
			})
		: 'Chưa đặt';

	const subject = `[TeamHub] Nhắc nhở: ${params.cardTitle} (tới hạn: ${dueAtText})`;

	const text = [
		`Workspace: ${params.workspaceName}`,
		`Board: ${params.boardName}`,
		`Card: ${params.cardTitle}`,
		`Tới hạn (dueAt): ${dueAtText} (${env.APP_TIMEZONE})`,
		'',
		'---',
		'TeamHub',
	].join('\n');

	const html = renderHtmlTemplate('reminder', {
		workspaceName: params.workspaceName,
		boardName: params.boardName,
		cardTitle: params.cardTitle,
		dueAtText,
		timezone: env.APP_TIMEZONE,
		year: String(new Date().getFullYear()),
	});

	return { subject, text, html };
}
