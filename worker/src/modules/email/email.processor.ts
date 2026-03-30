import { sendPasswordResetEmail } from '../../mail/mailer';

export type PasswordResetEmailJobData = {
	type: 'password_reset';
	to: string;
	email: string;
	resetUrl: string;
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

	throw new Error(`Unknown email job type: ${type}`);
}
