/**
 * moment-tasks.ts — the tasks/agenda beat, on the shared timeline engine.
 *
 * Rows from `cast.tasks_teaser` fill in, then the first row ticks done and
 * the pane-head "agenda" chip flips its count — the same reveal grammar as
 * the hero (WAAPI transform/opacity via `MomentTimeline`, see `./timeline.ts`
 * + `./CONTRACT.md`). `mountMomentTasks` wires the beat; the module
 * self-initialises every `[data-moment="tasks"]` root on load.
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
function flipChip(el: HTMLElement, nextText: string, doneClass: string): void {
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
		el.classList.add(doneClass);
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

/** WAAPI pop for the checkbox's check glyph — transform/opacity only. */
function popCheck(el: HTMLElement): void {
	el.style.opacity = '1';
	el.style.transform = 'none';
	el.animate(
		[
			{ opacity: 0, transform: 'scale(0.5)' },
			{ opacity: 1, transform: 'scale(1)' },
		],
		{ duration: 220, easing: EASE, fill: 'both' },
	);
}

export function mountMomentTasks(root: HTMLElement): MomentTimeline {
	const rows = Array.from(root.querySelectorAll<HTMLElement>('.mt-row'));
	const chip = root.querySelector<HTMLElement>('[data-chip]');
	const chipOpen = root.dataset.chipOpen ?? '';
	const chipDone = root.dataset.chipDone ?? '';
	const tickIndex = 0; // the row that ticks done — first (most launch-critical) task
	const tickRow = rows[tickIndex];
	const tickBox = tickRow?.querySelector<HTMLElement>('[data-box]') ?? null;
	const tickCheck = tickRow?.querySelector<HTMLElement>('[data-checkglyph]') ?? null;
	const tickChip = tickRow?.querySelector<HTMLElement>('[data-rowchip]') ?? null;

	const reset = (): void => {
		for (const el of rows) {
			el.getAnimations().forEach((a) => a.cancel());
			el.style.opacity = '';
			el.style.transform = '';
			el.classList.remove('done');
		}
		if (tickBox) tickBox.classList.remove('on');
		if (tickCheck) {
			tickCheck.getAnimations().forEach((a) => a.cancel());
			tickCheck.style.opacity = '';
			tickCheck.style.transform = '';
		}
		if (tickChip) tickChip.style.display = '';
		if (chip) {
			chip.getAnimations().forEach((a) => a.cancel());
			chip.textContent = chipOpen;
			chip.style.opacity = '';
			chip.style.transform = '';
			chip.classList.remove('done');
		}
	};

	const finalFrame = (): void => {
		for (const el of rows) {
			el.style.opacity = '1';
			el.style.transform = 'none';
		}
		tickRow?.classList.add('done');
		tickBox?.classList.add('on');
		if (tickCheck) {
			tickCheck.style.opacity = '1';
			tickCheck.style.transform = 'none';
		}
		if (tickChip) tickChip.style.display = '';
		if (chip) {
			chip.textContent = chipDone;
			chip.classList.add('done');
		}
	};

	// Beat: rows reveal staggered → the first ticks done → the chip flips.
	const build = (): ScheduledStep[] => {
		const steps: ScheduledStep[] = [];
		const START = 300;
		const STAGGER = 140;
		rows.forEach((el, i) => steps.push({ at: START + i * STAGGER, fn: () => reveal(el) }));
		const revealDone = START + (rows.length - 1) * STAGGER + REVEAL_MS;
		const tickAt = revealDone + 550;
		steps.push({
			at: tickAt,
			fn: () => {
				tickRow?.classList.add('done');
				tickBox?.classList.add('on');
				if (tickCheck) popCheck(tickCheck);
				if (tickChip) tickChip.style.display = '';
			},
		});
		steps.push({
			at: tickAt + 200,
			fn: () => {
				if (chip) flipChip(chip, chipDone, 'done');
			},
		});
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
	for (const el of document.querySelectorAll<HTMLElement>('[data-moment="tasks"]')) {
		mountMomentTasks(el);
	}
}

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', init);
} else {
	init();
}
