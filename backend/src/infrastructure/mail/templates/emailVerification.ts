import fs from 'fs';
import path from 'path';
import { renderHtmlTemplate } from './render';

export function buildEmailVerificationEmail(params: { email: string; verificationUrl: string; expiresAt: Date }) {
	const subject = 'TeamHub - Xác thực địa chỉ Email của bạn';

	const text = `
    Xin chào ${params.email},

    Vui lòng click vào đường link sau để xác thực địa chỉ email của bạn cho tài khoản TeamHub:
    ${params.verificationUrl}

    Link này sẽ hết hạn vào lúc ${params.expiresAt.toLocaleString()}.
    Nếu bạn không tạo tài khoản, xin vui lòng bỏ qua email này.
  `;

	const htmlFallback = `
    <h2>Xác thực địa chỉ Email</h2>
    <p>Xin chào ${params.email},</p>
    <p>Vui lòng click vào nút bên dưới để xác thực địa chỉ email của bạn cho tài khoản TeamHub:</p>
    <a href="${params.verificationUrl}" style="padding: 10px 20px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 5px;">Xác thực Email</a>
    <p>Link này sẽ hết hạn vào lúc ${params.expiresAt.toLocaleString()}.</p>
  `;

	return { subject, text, html: htmlFallback };
}