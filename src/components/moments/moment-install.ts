/**
 * moment-install.ts — the Ọba install beat, on the shared timeline engine.
 *
 * A store row from `cast.store_rows` gets installed: row highlight → a
 * scaleX progress fill (compositor-friendly, no `width` animation) →
 * the "installed · vX.Y.Z" chip flips in → the Installed pane gains the
 * entry and its count chip updates. Same WAAPI + `MomentTimeline` grammar as
 * the hero/tasks moments (see `./timeline.ts` + `./CONTRACT.md`).
 * `mountMomentInstall` wires the beat; the module self-initialises every
 * `[data-moment="install"]` root on load.
 */
import { MomentTimeline, type ScheduledStep } from './timeline';

const EASE = 'cubic-bezier(0.22, 0.61, 0.16, 1)';
const REVEAL_MS = 300;
const REVEAL_SHIFT = 6;
const CHIP_MS = 150;

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

/** Crossfade a chip's text (transform/opacity only) — flips once, no loop. */
function flipChip(el: HTMLElement, nextText: string): void {
	el.style.opacity = '1';
	el.style.transform = 'none';
	const out = el.animate(
		[
			{ opacity: 1, transform: 'translateY(0)' },
			{ opacity: 0, transform: 'translateY(-4px)' },
		],
		{ duration: CHIP_MS, easing: EASE, fill: 'forwards' },
	);
	out.onfinish = () => {
		el.textContent = nextText;
		el.style.opacity = '0';
		el.style.transform = 'translateY(4px)';
		el.animate(
			[
				{ opacity: 0, transform: 'translateY(4px)' },
				{ opacity: 1, transform: 'translateY(0)' },
			],
			{ duration: CHIP_MS, easing: EASE, fill: 'forwards' },
		);
	};
}

/** A brief amber glow over the row being installed — opacity only. */
function flashRow(glow: HTMLElement): void {
	glow.animate(
		[{ opacity: 0 }, { opacity: 1, offset: 0.45 }, { opacity: 0 }],
		{ duration: 620, easing: EASE, fill: 'both' },
	);
}

/** Progress fill — `transform: scaleX()` only, never `width` (contract). */
function fillProgress(el: HTMLElement): Animation {
	el.style.transform = 'scaleX(1)';
	return el.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], {
		duration: 720,
		easing: EASE,
		fill: 'both',
	});
}

/** WAAPI pop — transform/opacity only. */
function popIn(el: HTMLElement): void {
	el.style.opacity = '1';
	el.style.transform = 'none';
	el.animate(
		[
			{ opacity: 0, transform: 'scale(0.7)' },
			{ opacity: 1, transform: 'scale(1)' },
		],
		{ duration: 220, easing: EASE, fill: 'both' },
	);
}

export function mountMomentInstall(root: HTMLElement): MomentTimeline {
	const rows = Array.from(root.querySelectorAll<HTMLElement>('.mi-row'));
	const installRow = root.querySelector<HTMLElement>('[data-install-row]');
	const glow = installRow?.querySelector<HTMLElement>('[data-glow]') ?? null;
	const action = installRow?.querySelector<HTMLElement>('[data-action]') ?? null;
	const fill = installRow?.querySelector<HTMLElement>('[data-fill]') ?? null;
	const instChip = installRow?.querySelector<HTMLElement>('[data-instchip]') ?? null;
	const dot = installRow?.querySelector<HTMLElement>('[data-dot]') ?? null;
	const empty = root.querySelector<HTMLElement>('[data-empty]');
	const newrow = root.querySelector<HTMLElement>('[data-newrow]');
	const count = root.querySelector<HTMLElement>('[data-count]');

	const reset = (): void => {
		for (const el of rows) {
			el.getAnimations().forEach((a) => a.cancel());
			el.style.opacity = '';
			el.style.transform = '';
		}
		glow?.getAnimations().forEach((a) => a.cancel());
		if (glow) glow.style.opacity = '0';
		action?.classList.remove('installing');
		action?.classList.add('pre');
		fill?.getAnimations().forEach((a) => a.cancel());
		if (fill) fill.style.transform = 'scaleX(0)';
		dot?.classList.remove('on');
		if (empty) empty.style.display = 'block';
		if (newrow) {
			newrow.getAnimations().forEach((a) => a.cancel());
			newrow.style.opacity = '';
			newrow.style.transform = '';
		}
		if (count) {
			count.getAnimations().forEach((a) => a.cancel());
			count.textContent = '0';
			count.style.opacity = '';
			count.style.transform = '';
		}
	};

	const finalFrame = (): void => {
		for (const el of rows) {
			el.style.opacity = '1';
			el.style.transform = 'none';
		}
		action?.classList.remove('pre', 'installing');
		dot?.classList.add('on');
		if (empty) empty.style.display = '';
		if (newrow) {
			newrow.style.opacity = '1';
			newrow.style.transform = 'none';
		}
		if (count) count.textContent = '1';
	};

	// Beat: rows reveal → highlight → progress fill → installed chip →
	// the Installed pane gains the entry and its count flips.
	const build = (): ScheduledStep[] => {
		const steps: ScheduledStep[] = [];
		const START = 300;
		const STAGGER = 140;
		rows.forEach((el, i) => steps.push({ at: START + i * STAGGER, fn: () => reveal(el) }));
		const revealDone = START + (rows.length - 1) * STAGGER + REVEAL_MS;

		const highlightAt = revealDone + 450;
		steps.push({ at: highlightAt, fn: () => glow && flashRow(glow) });

		const installAt = highlightAt + 250;
		steps.push({
			at: installAt,
			fn: () => {
				action?.classList.remove('pre');
				action?.classList.add('installing');
				if (fill) fillProgress(fill);
			},
		});

		const doneAt = installAt + 720;
		steps.push({
			at: doneAt,
			fn: () => {
				action?.classList.remove('installing');
				dot?.classList.add('on');
				if (instChip) popIn(instChip);
			},
		});

		const sidebarAt = doneAt + 200;
		steps.push({
			at: sidebarAt,
			fn: () => {
				if (empty) empty.style.display = 'none';
				if (newrow) reveal(newrow);
			},
		});
		steps.push({ at: sidebarAt + 100, fn: () => count && flipChip(count, '1') });

		return steps;
	};

	const autoplay = (root.dataset.autoplay as 'viewport' | 'immediate' | 'manual') || 'viewport';
	const timeline = new MomentTimeline({ root, build, reset, finalFrame, autoplay, once: true });
	timeline.mount();

	const replayBtn = root.querySelector<HTMLElement>('[data-replay]');
	if (replayBtn) {
		if (timeline.prefersReducedMotion) replayBtn.style.display = 'none';
		else replayBtn.addEventListener('click', () => timeline.replay());
	}

	return timeline;
}

function init(): void {
	for (const el of document.querySelectorAll<HTMLElement>('[data-moment="install"]')) {
		mountMomentInstall(el);
	}
}

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', init);
} else {
	init();
}
