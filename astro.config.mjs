import mdx from '@astrojs/mdx';
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: process.env.SITE_URL || 'https://example.invalid',
  trailingSlash: 'always',
  integrations: [mdx()],
  security: { csp: true },
  // Shiki writes inline styles, which the CSP blocks.
  markdown: { syntaxHighlight: false },
});
