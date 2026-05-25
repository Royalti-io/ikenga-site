import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
	site: 'https://ikenga.dev',
	integrations: [
		starlight({
			title: 'Ikenga',
			description:
				'Your personal seat of strength for AI-augmented work.',
			social: [
				{
					icon: 'github',
					label: 'GitHub',
					href: 'https://github.com/royalti-io',
				},
			],
			customCss: ['./src/styles/global.css'],
			head: [
				{
					tag: 'script',
					attrs: {
						defer: true,
						src: 'https://static.cloudflareinsights.com/beacon.min.js',
						'data-cf-beacon':
							'{"token": "3fdcdf8ab9ba4ca68bd46410d1527108"}',
					},
				},
			],
			sidebar: [
				{
					label: 'Start here',
					items: [
						{ label: 'What is Ikenga?', slug: 'docs' },
						{ label: 'Install', slug: 'docs/getting-started' },
						{ label: 'Build your first pkg', slug: 'docs/build-a-pkg' },
					],
				},
				{
					label: 'Pkgs',
					autogenerate: { directory: 'docs/pkgs' },
				},
				{
					label: 'Engines',
					autogenerate: { directory: 'docs/engines' },
				},
				{
					label: 'MCP',
					items: [{ label: 'mcp-iyke', slug: 'docs/mcp-iyke' }],
				},
			],
		}),
		react(),
		sitemap(),
	],
	vite: {
		plugins: [tailwindcss()],
	},
});
