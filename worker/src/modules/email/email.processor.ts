import { sendPasswordResetEmail, sendEmailVerificationEmail } from '../../mail/mailer';

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

export async function processEmailJob(data: any) {
	const type = (data as any)?.type as string | undefined;

	if (type === 'password_reset') {
		const payload = data as PasswordResetEmailJobData;
		await sendPasswordResetEmail({
			to: payload.to,
			email: payload.email,
			resetUrl: payload.resetUrl,
			expiresAt: new Date(payload.expiresAtIso),
		});
		return;
	}

	if (type === 'email_verification') {
		const payload = data as EmailVerificationJobData;
		await sendEmailVerificationEmail({
			to: payload.to,
			email: payload.email,
			verificationUrl: payload.verificationUrl,
			expiresAt: new Date(payload.expiresAtIso),
		});
		return;
	}

	throw new Error(`Unknown email job type: ${type}`);
}
