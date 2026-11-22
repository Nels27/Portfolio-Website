# Task 08: Images, headers and no-JavaScript checks

> **For agentic workers:** REQUIRED SUB-SKILL: use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax. Read [00-overview.md](00-overview.md) and the Known traps and Guardrails in [CONTEXT.md](../../../../CONTEXT.md) first. Do only this task.

**Goal:** Optimized project images, security headers, and proof that pages run no JavaScript and break no CSP rule.

**Branch:** `task/08-images-headers`

**Files:**
- `tests/e2e/assets.spec.ts`
- `public/_headers`
- `src/components/ProjectCard.astro`
- `src/pages/projects/[slug].astro`

**Interfaces:**
- Consumes: `WEB_ROUTES` from Task 07. The cover from Task 05.
- Produces: `public/_headers`. Cover and gallery rendering.

**Notes:**
- Never use a raw `<img>` for a file in `src/assets/`.

- [ ] **Step 1: Start the branch**

````bash
git switch main && git pull && git switch -c task/08-images-headers
npm ci
````

- [ ] **Step 2: Write the failing tests**

`tests/e2e/assets.spec.ts`

````ts
import { readdir } from 'node:fs/promises';
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
  const files = await readdir('dist', { recursive: true });
  expect(files.filter((f) => /\.m?js$/.test(f))).toEqual([]);
});

test('responses carry security and noindex headers', async ({ request }) => {
  const headers = (await request.get('/')).headers();
  expect(headers).toMatchObject({
    'x-robots-tag': 'noindex',
    'x-content-type-options': 'nosniff',
    'x-frame-options': 'DENY',
    'referrer-policy': 'strict-origin-when-cross-origin',
  });
});

for (const { route, loading } of [
  { route: '/tracks/side-projects/', loading: 'lazy' },
  { route: '/projects/meridian-sigma/', loading: 'eager' },
]) {
  test(`the cover on ${route} is optimized`, async ({ page, request }) => {
    await page.goto(route);
    const image = page.locator('main img');
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
````

- [ ] **Step 3: Run the tests and confirm they fail**

````bash
npm run build && npx playwright test tests/e2e/assets.spec.ts --project=desktop
````

Expected: failures, because the code does not exist yet.

- [ ] **Step 4: Create the headers**

`public/_headers`

````text
/*
  X-Robots-Tag: noindex
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
````

- [ ] **Step 5: Replace these two files to render images**

`src/components/ProjectCard.astro`

````astro
---
import { Image } from 'astro:assets';
import type { CollectionEntry } from 'astro:content';
import { formatPeriod } from '../lib/dates';

interface Props {
  project: CollectionEntry<'projects'>;
}
const { project } = Astro.props;
const { data } = project;
---

<article class="card" data-testid="project-card">
  {
    data.cover && (
      <Image src={data.cover} alt={data.coverAlt ?? ''} widths={[400, 800]} sizes="(max-width: 46rem) 100vw, 46rem" />
    )
  }
  <h3><a href={`/projects/${project.id}/`}>{data.title}</a></h3>
  <p class="muted">{formatPeriod(data.period)}</p>
  <p>{data.summary}</p>
</article>
````

`src/pages/projects/[slug].astro`

````astro
---
import { Image } from 'astro:assets';
import { getCollection, render, type CollectionEntry } from 'astro:content';
import GitHubCard from '../../components/GitHubCard.astro';
import Base from '../../layouts/Base.astro';
import { formatPeriod } from '../../lib/dates';
import { skillsForProject } from '../../lib/evidence';
import { loadAll } from '../../load';

export async function getStaticPaths() {
  const projects = await getCollection('projects');
  return projects
    .filter((p) => import.meta.env.DEV || !p.data.draft)
    .map((project) => ({ params: { slug: project.id }, props: { project } }));
}
interface Props {
  project: CollectionEntry<'projects'>;
}
const { project } = Astro.props;
const { data } = project;
const { Content } = await render(project);
const { skills, tracks } = await loadAll();
const projectSkills = skillsForProject(skills, project.id);
const projectTracks = tracks.filter((t) => data.tracks.some((ref) => ref.id === t.id));
---

<Base title={data.title} description={data.summary}>
  <h1>{data.title}</h1>
  <p>{data.summary}</p>
  {
    data.cover && (
      <Image
        src={data.cover}
        alt={data.coverAlt ?? ''}
        widths={[400, 800, 1200]}
        sizes="(max-width: 46rem) 100vw, 46rem"
        loading="eager"
      />
    )
  }
  <dl>
    <dt>Role</dt><dd>{data.role}</dd>
    <dt>Period</dt><dd>{formatPeriod(data.period)}</dd>
    <dt>Stack</dt><dd>{data.stack.join(', ')}</dd>
    <dt>Tracks</dt>
    {projectTracks.map((t) => <dd><a href={`/tracks/${t.id}/`}>{t.data.title}</a></dd>)}
  </dl>
  <h2>Outcomes</h2>
  <ul>{data.outcomes.map((o) => <li>{o}</li>)}</ul>
  {projectSkills.length > 0 && <h2>Skills shown</h2>}
  {projectSkills.length > 0 && <ul>{projectSkills.map((s) => <li>{s.data.name}</li>)}</ul>}
  <Content />
  {
    data.gallery.map((item) => (
      <figure>
        <Image src={item.src} alt={item.alt} widths={[400, 800, 1200]} sizes="(max-width: 46rem) 100vw, 46rem" />
        {item.caption && <figcaption>{item.caption}</figcaption>}
      </figure>
    ))
  }
  {data.demo && <p><a href={data.demo}>Live demo</a></p>}
  {data.repo && <GitHubCard repo={data.repo} />}
</Base>
````

- [ ] **Step 6: Run every gate**

````bash
npm run check
npm run test:unit
npm run build
npm run test:e2e
````

Expected: every command exits 0, with 0 type errors and no failing or skipped test. If one fails, fix your own work. Never change a test, threshold or gate to make it pass.

- [ ] **Step 7: Commit, push and open the PR**

````bash
git add public src tests
git status --short
git commit -m "feat: add optimized images and security headers"
git push -u origin task/08-images-headers
gh pr create --base main --title "feat: add optimized images and security headers" --body-file - <<'EOF'
## Built

## Gate output

## Defaults relied on

## Open questions

EOF
````

Fill in every section of the PR body first. If `gh` is unavailable, report the compare URL.

- [ ] **Step 8: Stop**

Do not merge and do not start the next task. The owner runs the Opus review and merges.
