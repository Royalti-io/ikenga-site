// Cloudflare Pages Function — POST /api/subscribe
//
// Single opt-in newsletter sign-up via Resend. Adds the contact to a dedicated
// "Ikenga" audience, so Ikenga broadcasts (which target that audience) reach
// only real sign-ups — fully separate from any other Royalti audience. Resend
// handles unsubscribe + the List-Unsubscribe header on every broadcast.
//
// Why Resend (not the shared Royalti Listmonk): contacts are upserted
// gracefully (no "email already exists" 409 to swallow), and a dedicated
// audience keeps the Ikenga list cleanly separated.
//
// Env (Pages → Settings → Variables; mirror in site/.dev.vars for
// `wrangler pages dev`):
//   RESEND_API_KEY       Resend API key with Contacts access  (mark as Secret)
//   IKENGA_AUDIENCE_ID   the "Ikenga" audience id             (default below)

interface Env {
	RESEND_API_KEY?: string;
	IKENGA_AUDIENCE_ID?: string;
}

const json = (data: unknown, status = 200): Response =>
	new Response(JSON.stringify(data), {
		status,
		headers: { 'content-type': 'application/json' },
	});

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const DEFAULT_AUDIENCE_ID = '77f60f7e-f220-42da-84c6-28db8f0b05db';

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

	if (!env.RESEND_API_KEY) {
		return json({ error: 'Subscriptions are not configured yet.' }, 500);
	}
	const audienceId = env.IKENGA_AUDIENCE_ID ?? DEFAULT_AUDIENCE_ID;

	let res: Response;
	try {
		res = await fetch(`https://api.resend.com/audiences/${audienceId}/contacts`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${env.RESEND_API_KEY}`,
			},
			body: JSON.stringify({ email, unsubscribed: false }),
		});
	} catch {
		return json({ error: 'Could not reach the mailing service.' }, 502);
	}

	// 2xx → added (Resend upserts an existing contact idempotently).
	if (res.ok) {
		return json({ ok: true });
	}

	// Already a contact in the audience → success from the visitor's POV.
	const text = await res.text().catch(() => '');
	if (res.status === 409 || /already|exists|registered/i.test(text)) {
		return json({ ok: true });
	}

	return json({ error: 'Could not subscribe right now. Please try again.' }, 502);
};
