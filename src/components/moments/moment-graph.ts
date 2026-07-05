/**
 * moment-graph.ts — SPIKE-07 capability-graph moment, client half only.
 *
 * The radial-bundle layout (d3-hierarchy cluster + d3-shape lineRadial/
 * curveBundle) runs at BUILD TIME in MomentGraph.astro — nothing here
 * imports d3. This script does exactly two runtime things:
 *
 *   1. hover/focus-to-trace — dim everything but the incident edges + nodes
 *      of the node under the pointer/keyboard focus (outgoing vs incoming
 *      colour, matching the shell reference).
 *   2. an optional slow ambient intro (edge draw-in via stroke-dashoffset,
 *      node/arc fade via opacity) — WAAPI only, gated by
 *      prefers-reduced-motion + IntersectionObserver.
 *
 * The static SVG (server-rendered, no fetch) is already the correct
 * reduced-motion / no-JS frame — both features below only ever ADD motion
 * or interaction on top of it, never required for legibility (island
 * contract: CONTRACT.md).
 */
const EASE = 'cubic-bezier(0.22, 0.61, 0.16, 1)';

function wireTrace(svg: SVGSVGElement): void {
	const edges = Array.from(svg.querySelectorAll<SVGPathElement>('.mg-edge'));
	const nodeEls = Array.from(svg.querySelectorAll<SVGGElement>('.mg-node'));

	function clear(): void {
		svg.classList.remove('mg-tracing');
		for (const e of edges) e.classList.remove('mg-edge-out', 'mg-edge-in', 'mg-edge-dim');
		for (const n of nodeEls) n.classList.remove('mg-node-dim', 'mg-node-hot');
	}

	function trace(id: string): void {
		svg.classList.add('mg-tracing');
		const keep = new Set<string>([id]);
		for (const e of edges) {
			const isOut = e.dataset.source === id;
			const isIn = e.dataset.target === id;
			e.classList.toggle('mg-edge-out', isOut);
			e.classList.toggle('mg-edge-in', isIn);
			e.classList.toggle('mg-edge-dim', !isOut && !isIn);
			if (isOut && e.dataset.target) keep.add(e.dataset.target);
			if (isIn && e.dataset.source) keep.add(e.dataset.source);
		}
		for (const n of nodeEls) {
			const nid = n.dataset.nodeId ?? '';
			n.classList.toggle('mg-node-hot', nid === id);
			n.classList.toggle('mg-node-dim', !keep.has(nid));
		}
	}

	for (const n of nodeEls) {
		const id = n.dataset.nodeId ?? '';
		n.addEventListener('pointerenter', () => trace(id));
		n.addEventListener('focus', () => trace(id));
		n.addEventListener('pointerleave', clear);
		n.addEventListener('blur', clear);
	}
	svg.addEventListener('pointerleave', clear);
}

/** Draw-in intro: staggered arc/node fade + edge stroke-dashoffset reveal. */
function playIntro(svg: SVGSVGElement): void {
	const edges = Array.from(svg.querySelectorAll<SVGPathElement>('.mg-edge'));
	const fadeIn = Array.from(svg.querySelectorAll<SVGElement>('.mg-arc, .mg-node'));

	for (const el of fadeIn) {
		el.animate([{ opacity: 0 }, { opacity: 1 }], {
			duration: 480,
			easing: EASE,
			fill: 'both',
			delay: 40 + Math.random() * 200,
		});
	}
	for (const e of edges) {
		const len = e.getTotalLength();
		e.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }], {
			duration: 900,
			easing: EASE,
			fill: 'both',
			delay: 100 + Math.random() * 340,
		});
	}
}

function mountMomentGraph(root: HTMLElement): void {
	const svg = root.querySelector<SVGSVGElement>('svg.mg-svg');
	if (!svg) return;

	wireTrace(svg);

	if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

	const io = new IntersectionObserver(
		(entries) => {
			for (const e of entries) {
				if (e.isIntersecting) {
					playIntro(svg);
					io.disconnect();
				}
			}
		},
		{ threshold: 0.3 },
	);
	io.observe(root);
}

function init(): void {
	for (const el of document.querySelectorAll<HTMLElement>('[data-moment="graph"]')) {
		mountMomentGraph(el);
	}
}

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', init);
} else {
	init();
}
