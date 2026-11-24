import { readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import { WEB_ROUTES } from './routes';

for (const route of WEB_ROUTES) {
  test(`${route} runs no JavaScript and breaks no CSP rule`, async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
    await page.goto(route, { waitUntil: 'networkidle' });
    expect(errors).toEqual([]);
    await expect(page.locator('script:not([type="application/ld+json"])')).toHaveCount(0);
    await expect(page.locator('meta[http-equiv="content-security-policy" i]')).toHaveCount(1);
  });
}

test('the build has no JavaScript bundles', async () => {
  const dist = fileURLToPath(new URL('../../dist/', import.meta.url));
  const files = await readdir(dist, { recursive: true });
  expect(files.filter((f) => /\.[mc]?jsx?$/.test(f))).toEqual([]);
});

const SECURITY_HEADERS = {
  'x-robots-tag': 'noindex',
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'referrer-policy': 'strict-origin-when-cross-origin',
};

test('pages, assets and the 404 page carry security and noindex headers', async ({ page, request }) => {
  await page.goto('/projects/meridian-sigma/');
  const asset = await page.locator('main > img').getAttribute('src');
  expect(asset).toMatch(/^\/_astro\//);
  for (const url of ['/', asset ?? '', '/definitely-not-a-page/']) {
    expect((await request.get(url)).headers(), url).toMatchObject(SECURITY_HEADERS);
  }
});

for (const { route, cover, loading } of [
  {
    route: '/tracks/side-projects/',
    cover: '[data-testid="project-card"]:has(a[href="/projects/meridian-sigma/"]) img',
    loading: 'lazy',
  },
  { route: '/projects/meridian-sigma/', cover: 'main > img', loading: 'eager' },
]) {
  test(`the cover on ${route} is optimized`, async ({ page, request }) => {
    await page.goto(route);
    const image = page.locator(cover);
    await expect(image).toHaveCount(1);
    await expect(image).toHaveAttribute('width', /^\d+$/);
    await expect(image).toHaveAttribute('height', /^\d+$/);
    await expect(image).toHaveAttribute('alt', /\S/);
    await expect(image).toHaveAttribute('src', /\.webp$/);
    await expect(image).toHaveAttribute('srcset', /400w.*800w/);
    await expect(image).toHaveAttribute('loading', loading);
    expect((await request.get((await image.getAttribute('src')) ?? '')).status()).toBe(200);
  });
}
