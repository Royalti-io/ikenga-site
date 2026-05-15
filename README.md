# ikenga-site

Marketing site and documentation for [Ikenga](https://ikenga.dev) — your personal seat of strength for AI-augmented work.

User-facing copy follows the locked vocabulary in `design/shell/05-lore-and-nomenclature.md` (Tier-1 surface terms: Ikenga, Obi, Chi, Iyke, plus the rituals — consecration, daily address, share kola).

**Status**: private, pre-launch. Flip to public + Apache-2.0 at announce.

## Stack

- **Astro 5** + **Starlight** — one site, two sections: marketing at `/`, docs at `/docs/*`
- **Tailwind CSS 4** via the official Vite plugin
- **React 19** for the handful of interactive islands (AppBridge sandbox, token explorer)
- **`@ikenga/tokens`** consumed via `workspace:*` so the site stays visually locked to the shell
- **Pagefind** for static, infra-free search (Starlight default)

## Develop

```bash
# from the workspace root, once
pnpm install

# then
cd site
pnpm dev          # http://localhost:4321
pnpm build        # static output to dist/
pnpm preview      # serve dist/
pnpm check        # astro + typescript checks
```

## Content layout

```
src/
├── pages/
│   └── index.astro                  → /            marketing landing
└── content/docs/docs/               (the inner "docs" is part of the URL prefix)
    ├── index.mdx                    → /docs/
    ├── getting-started.mdx          → /docs/getting-started
    ├── pkgs/index.mdx               → /docs/pkgs
    ├── engines/index.mdx            → /docs/engines
    └── mcp-iyke.mdx                 → /docs/mcp-iyke
```

Add marketing pages under `src/pages/`. Add docs under `src/content/docs/docs/` and they show up in the Starlight sidebar automatically (configured in `astro.config.mjs`).

## Deploy

Target: Cloudflare Pages or Vercel. Static output, no server runtime required.
