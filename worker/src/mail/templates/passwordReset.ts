import env from '../../config/env';
import { renderHtmlTemplate } from './render';

export function buildPasswordResetEmail(params: {
	email: string;
	resetUrl: string;
	expiresAt: Date;
}) {
	const expiresAtText = params.expiresAt.toLocaleString('vi-VN', {
		timeZone: env.APP_TIMEZONE,
		hour12: false,
	});

	const subject = '[TeamHub] Đặt lại mật khẩu';

	const text = [
		`Bạn đã yêu cầu đặt lại mật khẩu cho: ${params.email}`,
		`Link đặt lại mật khẩu (hết hạn: ${expiresAtText} ${env.APP_TIMEZONE}):`,
		params.resetUrl,
		'',
		'Nếu bạn không yêu cầu, hãy bỏ qua email này.',
		'',
		'---',
		'TeamHub',
	].join('\n');

	const html = renderHtmlTemplate('password-reset', {
		email: params.email,
		resetUrl: params.resetUrl,
		expiresAtText,
		year: String(new Date().getFullYear()),
	});

	return { subject, text, html };
}
