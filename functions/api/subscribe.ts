// Cloudflare Pages Function — POST /api/subscribe
//
// Adds newsletter sign-ups to the Listmonk "Ikenga" list via the authenticated
// ADMIN API. The list is double opt-in and Listmonk's `send_optin_confirmation`
// is enabled, so the subscriber is created `unconfirmed` and Listmonk emails the
// opt-in confirmation; they only start receiving campaigns after they click it.
//
// Credentials stay server-side (Cloudflare Pages env / secrets) — never in the
// static bundle or the browser. Honeypot + email validation happen here.
//
// Env vars (Pages → Settings → Variables & Secrets; mirror in site/.dev.vars for
// `wrangler pages dev`):
//   LISTMONK_API_URL    e.g. https://listmonk.royalti.io  (default below)
//   LISTMONK_USERNAME   Listmonk API user
//   LISTMONK_PASSWORD   Listmonk API token/password   (mark as a Secret)
//   IKENGA_LIST_ID      numeric list id (default 21)

interface Env {
	LISTMONK_API_URL?: string;
	LISTMONK_USERNAME?: string;
	LISTMONK_PASSWORD?: string;
	IKENGA_LIST_ID?: string;
}

const json = (data: unknown, status = 200): Response =>
	new Response(JSON.stringify(data), {
		status,
		headers: { 'content-type': 'application/json' },
	});

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export const onRequestPost = async (context: {
	request: Request;
	env: Env;
}): Promise<Response> => {
	const { request, env } = context;

	let body: Record<string, unknown>;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid request.' }, 400);
	}

	// Honeypot: real users never fill this hidden field. Accept silently.
	if (typeof body.company === 'string' && body.company.trim() !== '') {
		return json({ ok: true });
	}

	const email = String(body.email ?? '').trim().toLowerCase();
	if (!EMAIL_RE.test(email) || email.length > 254) {
		return json({ error: 'Enter a valid email address.' }, 400);
	}

	const apiUrl = (env.LISTMONK_API_URL ?? 'https://listmonk.royalti.io').replace(/\/+$/, '');
	const listId = Number(env.IKENGA_LIST_ID ?? '21');
	if (!env.LISTMONK_USERNAME || !env.LISTMONK_PASSWORD || !Number.isFinite(listId)) {
		return json({ error: 'Subscriptions are not configured yet.' }, 500);
	}

	const auth = 'Basic ' + btoa(`${env.LISTMONK_USERNAME}:${env.LISTMONK_PASSWORD}`);

	let res: Response;
	try {
		res = await fetch(`${apiUrl}/api/subscribers`, {
			method: 'POST',
			headers: { 'content-type': 'application/json', authorization: auth },
			body: JSON.stringify({
				email,
				name: '',
				status: 'enabled',
				lists: [listId],
				// double opt-in: leave unconfirmed so Listmonk sends the opt-in email
				preconfirm_subscriptions: false,
			}),
		});
	} catch {
		return json({ error: 'Could not reach the mailing service.' }, 502);
	}

	if (res.ok) {
		return json({ ok: true });
	}

	// Already on the list → success from the visitor's POV. Listmonk returns
	// 409 (or a "already exists" message) for a duplicate email.
	const text = await res.text().catch(() => '');
	if (res.status === 409 || /already|exists|duplicate/i.test(text)) {
		return json({ ok: true });
	}

	return json({ error: 'Could not subscribe right now. Please try again.' }, 502);
};
