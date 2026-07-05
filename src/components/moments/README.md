# Moment islands

Self-contained Astro islands that recreate one Ikenga app beat at display
fidelity — token-driven, WAAPI + IntersectionObserver, reduced-motion-safe.
See `CONTRACT.md` for the island contract that every moment implements.

## `cast.json` — provenance (sync-from-plan)

`cast.json` in this folder is a **byte-identical copy** of the canonical cast
fixture that lives in the plan:

    plans/site-redesign/designs/_fixtures/cast.json

The site must stay standalone (it builds without the workspace meta-repo on
disk), so the fixture is vendored here rather than imported across repo
boundaries. When the plan's fixture changes, re-copy it:

    cp ../../../../plans/site-redesign/designs/_fixtures/cast.json ./cast.json

Because the copy is byte-identical, a future sync check can `diff` the two
files to detect drift. The fixture's own `source` block records the base
design (`home-hero-theatre.html` rev 2), the registry snapshot it was
verified against, and the verification date — all content shown by a moment
traces back to that record (honesty gate G-19/G-21: only registry-published
pkgs are depicted; no music-vertical flavor).
