import env from '../../../config/env';
import { renderHtmlTemplate } from './render';

export function buildEmailVerificationEmail(params: {
	email: string;
	verificationUrl: string;
	expiresAt: Date;
}) {
	const expiresAtText = params.expiresAt.toLocaleString('vi-VN', {
		timeZone: env.APP_TIMEZONE,
		hour12: false,
	});

	const subject = '[TeamHub] Xác thực địa chỉ Email của bạn';

	const text = [
		`Chào mừng bạn đến với TeamHub!`,
		`Vui lòng click vào link sau để xác thực email cho tài khoản ${params.email}:`,
		params.verificationUrl,
		'',
		`Link xác thực có hiệu lực đến: ${expiresAtText} (${env.APP_TIMEZONE})`,
		'Nếu bạn không thực hiện đăng ký tài khoản, vui lòng bỏ qua email này.',
		'',
		'---',
		'TeamHub',
	].join('\n');

	const html = renderHtmlTemplate('email-verification', {
		email: params.email,
		verificationUrl: params.verificationUrl,
		expiresAtText,
		year: String(new Date().getFullYear()),
	});

	return { subject, text, html };
}