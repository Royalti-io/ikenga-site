/**
 * moment-hero.ts — the proving-moment hero's beat, on the shared timeline engine.
 *
 * `MomentTimeline` (the reusable spine every "shell moment" on ikenga.dev
 * drives) now lives in `./timeline.ts` — extracted at WP-06 so the tasks and
 * install moments can share it verbatim. This module keeps only the
 * hero-specific wiring: the reveal helper, the beat schedule (type
 * `/groundwork status` → panes light up → artifact assembles → chips settle),
 * and the rotating-agent H1. Behavior here is unchanged by the extraction.
 *
 * Motion rules (island contract): compositor-friendly properties only
 * (transform / opacity) via WAAPI; durations + easing from the token ramp
 * below. No CSS scroll-timeline dependency.
 *
 * `mountMomentHero` wires the hero beat on top of the generic engine. The
 * module self-initialises every `[data-moment="hero"]` root on load.
 */
import { MomentTimeline, type MomentTimelineOptions, type ScheduledStep } from './timeline';

// ── Token ramp (mirrors the scoped CSS --mh-ease / durations) ─────────────
const EASE = 'cubic-bezier(0.22, 0.61, 0.16, 1)';
const REVEAL_MS = 300;
const REVEAL_SHIFT = 6; // px of translateY the reveal rises through

// ── Hero-specific wiring ──────────────────────────────────────────────────

/** WAAPI reveal — transform/opacity only, final state committed inline. */
function reveal(el: HTMLElement): void {
	el.style.opacity = '1';
	el.style.transform = 'none';
	el.animate(
		[
			{ opacity: 0, transform: `translateY(${REVEAL_SHIFT}px)` },
			{ opacity: 1, transform: 'translateY(0)' },
		],
		{ duration: REVEAL_MS, easing: EASE, fill: 'both' },
	);
}

export function mountMomentHero(root: HTMLElement): MomentTimeline {
	const typed = root.querySelector<HTMLElement>('[data-typed]');
	const cursor = root.querySelector<HTMLElement>('[data-cursor]');
	const cmd = root.dataset.cmd ?? '';
	const animated = () => Array.from(root.querySelectorAll<HTMLElement>('.mh-m'));
	const group = (n: number) =>
		Array.from(root.querySelectorAll<HTMLElement>(`.mh-m[data-step="${n}"]`));

	const reset = (): void => {
		if (typed) typed.textContent = '';
		if (cursor) cursor.style.display = '';
		for (const el of animated()) {
			el.getAnimations().forEach((a) => a.cancel());
			el.style.opacity = '';
			el.style.transform = '';
		}
	};

	const finalFrame = (): void => {
		if (typed) typed.textContent = cmd;
		if (cursor) cursor.style.display = 'none';
		for (const el of animated()) {
			el.style.opacity = '1';
			el.style.transform = 'none';
		}
	};

	// Locked D-01 pacing: type → +420 status → +700 board → +900 artifact
	// → +900 settle. Staggers per group match the board rev 2.
	const build = (): ScheduledStep[] => {
		const steps: ScheduledStep[] = [];
		const START = 380;
		const CHAR = 52;
		for (let i = 0; i < cmd.length; i++) {
			const upto = i + 1;
			steps.push({
				at: START + i * CHAR,
				fn: () => {
					if (typed) typed.textContent = cmd.slice(0, upto);
				},
			});
		}
		const typeDone = START + cmd.length * CHAR;
		const t2 = typeDone + 420;
		const t3 = t2 + 700;
		const t4 = t3 + 900;
		const t5 = t4 + 900;
		const groups: Array<[number, number, number]> = [
			[2, t2, 160],
			[3, t3, 130],
			[4, t4, 150],
			[5, t5, 120],
		];
		for (const [n, base, stagger] of groups) {
			group(n).forEach((el, i) =>
				steps.push({ at: base + i * stagger, fn: () => reveal(el) }),
			);
		}
		return steps;
	};

	const autoplay = (root.dataset.autoplay as MomentTimelineOptions['autoplay']) || 'viewport';
	const timeline = new MomentTimeline({ root, build, reset, finalFrame, autoplay, once: true });
	timeline.mount();

	const replayBtn = root.querySelector<HTMLElement>('[data-replay]');
	if (replayBtn) {
		if (timeline.prefersReducedMotion) replayBtn.style.display = 'none';
		else replayBtn.addEventListener('click', () => timeline.replay());
	}

	mountAgentRotator(root, timeline.prefersReducedMotion);
	return timeline;
}

/**
 * Rotating-agent H1 (Claude Code → Codex → Gemini CLI). Independent of the
 * one-shot moment: an interval loop that pauses when the tab is hidden.
 * Reduced-motion pins the first slot (CSS shows only `.cur`).
 */
function mountAgentRotator(root: HTMLElement, reduce: boolean): void {
	const rot = root.querySelector<HTMLElement>('[data-rot]');
	if (!rot) return;
	const slots = Array.from(rot.querySelectorAll<HTMLElement>('.mh-slot'));
	if (slots.length < 2) return;

	rot.style.display = 'inline-flex';
	if (reduce) return;

	const setWidth = (el: HTMLElement) => {
		rot.style.width = `${el.getBoundingClientRect().width}px`;
	};
	rot.style.transition = `width 0.45s ${EASE}`;
	requestAnimationFrame(() => setWidth(slots[0]));

	let idx = 0;
	let timer = 0;
	const tick = () => {
		const prev = slots[idx];
		idx = (idx + 1) % slots.length;
		const next = slots[idx];
		prev.animate(
			[
				{ opacity: 1, transform: 'translateY(0)' },
				{ opacity: 0, transform: 'translateY(-0.3em)' },
			],
			{ duration: 320, easing: EASE, fill: 'forwards' },
		);
		prev.classList.remove('cur');
		next.classList.add('cur');
		next.animate(
			[
				{ opacity: 0, transform: 'translateY(0.3em)' },
				{ opacity: 1, transform: 'translateY(0)' },
			],
			{ duration: 320, delay: 120, easing: EASE, fill: 'forwards' },
		);
		setWidth(next);
	};

	const start = () => {
		if (!timer) timer = window.setInterval(tick, 2600);
	};
	const stop = () => {
		if (timer) {
			clearInterval(timer);
			timer = 0;
		}
	};
	start();
	document.addEventListener('visibilitychange', () => {
		if (document.hidden) stop();
		else start();
	});
}

// ── Self-init ─────────────────────────────────────────────────────────────
function init(): void {
	for (const el of document.querySelectorAll<HTMLElement>('[data-moment="hero"]')) {
		mountMomentHero(el);
	}
}

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', init);
} else {
	init();
}
