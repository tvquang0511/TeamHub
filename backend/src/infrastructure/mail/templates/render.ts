import { readFileSync } from 'node:fs';
import path from 'node:path';

export function escapeHtml(input: string) {
	return input
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;');
}

function templatePath(name: string) {
	// `__dirname` points to worker/src/mail/templates at runtime (ts-node).
	return path.join(__dirname, `${name}.html`);
}

export function renderHtmlTemplate(
	name: 'reminder' | 'password-reset',
	variables: Record<string, string>,
) {
	const raw = readFileSync(templatePath(name), 'utf8');

	// Replace {{var}} with escaped values.
	return raw.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key: string) => {
		const value = variables[key];
		return escapeHtml(value ?? '');
	});
}
