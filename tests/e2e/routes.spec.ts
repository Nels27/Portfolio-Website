import { expect, test } from '@playwright/test';
import { TRACKS, WEB_ROUTES } from './routes';

for (const route of WEB_ROUTES) {
  test(`${route} renders`, async ({ page }) => {
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle(/Nelson Raphael/);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /\S/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });

  test(`${route} has no broken internal links`, async ({ page, request }) => {
    await page.goto(route);
    const hrefs = await page.locator('a[href^="/"]').evaluateAll((links) =>
      [...new Set(links.map((a) => a.getAttribute('href') ?? ''))],
    );
    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) {
      const response = await request.get(href, { maxRedirects: 0 });
      expect(response.status(), href).toBe(200);
    }
  });
}

test('unknown paths return the custom 404 page', async ({ page }) => {
  for (const path of ['/nope', '/nope/', '/projects/nope/']) {
    const response = await page.goto(path);
    expect(response?.status()).toBe(404);
    await expect(page.locator('h1')).toHaveText('Page not found');
  }
});

test('paths without a trailing slash redirect', async ({ request }) => {
  const response = await request.get('/journey', { maxRedirects: 0 });
  expect(response.status()).toBe(307);
  expect(response.headers().location).toMatch(/\/journey\/$/);
});

test('home shows every track in order and the featured projects', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('track-selector').getByRole('link')).toHaveText(TRACKS.map((t) => t.title));
  await expect(page.getByTestId('project-card').locator('h3')).toHaveText(['Portfolio Website', 'AgentsOfOlympus']);
});

for (const track of TRACKS) {
  test(`every ${track.id} skill links to evidence`, async ({ page, request }) => {
    await page.goto(`/tracks/${track.id}/`);
    await expect(page.locator('h1')).toHaveText(track.title);
    const skills = await page.getByTestId('skill').all();
    expect(skills.length).toBeGreaterThan(0);
    for (const skill of skills) {
      const href = await skill.getByRole('link').first().getAttribute('href');
      expect(href).toMatch(/^\/projects\//);
      expect((await request.get(href ?? '')).status()).toBe(200);
    }
  });
}

test('the professional track lists roles newest first', async ({ page }) => {
  await page.goto('/tracks/professional/');
  await expect(page.getByTestId('role').locator('h3')).toHaveText([
    'Test Architect',
    'Test Engineer',
    'Embedded Software Engineer',
    'eMobility Early Career Experience Program',
  ]);
});

test('side projects are ranked with featured projects first', async ({ page }) => {
  await page.goto('/tracks/side-projects/');
  await expect(page.getByTestId('project-card').locator('h3')).toHaveText([
    'Portfolio Website',
    'AgentsOfOlympus',
    'Meridian-Sigma',
  ]);
});

test('a repo-backed project shows a GitHub card and others do not', async ({ page }) => {
  await page.goto('/projects/portfolio-website/');
  await expect(page.getByTestId('github-card')).toContainText('Nels27/Portfolio-Website');
  await page.goto('/projects/agentsofolympus/');
  await expect(page.getByTestId('github-card')).toContainText('Nels27/AgentsOfOlympus');
  await page.goto('/projects/meridian-sigma/');
  await expect(page.getByTestId('github-card')).toHaveCount(0);
});

test('the colophon shows the data source', async ({ page }) => {
  await page.goto('/colophon/');
  await expect(page.getByTestId('source')).toHaveText(/^(?:live|cache|fixture)$/);
});
