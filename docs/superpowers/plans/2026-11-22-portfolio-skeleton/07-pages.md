# Task 07: Pages and route tests

> **For agentic workers:** REQUIRED SUB-SKILL: use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax. Read [00-overview.md](00-overview.md) and the Known traps and Guardrails in [CONTEXT.md](../../../../CONTEXT.md) first. Do only this task.

**Goal:** Every web page rendered from content, with browser tests running against Cloudflare’s own routing.

**Branch:** `task/07-pages`

**Files:**
- `wrangler.jsonc`
- `playwright.config.ts`
- `tests/unit/adapt.test.ts`
- `tests/e2e/routes.ts`
- `tests/e2e/routes.spec.ts`
- `public/favicon.svg`
- `public/robots.txt`
- `src/lib/adapt.ts`
- `src/load.ts`
- `src/styles/global.css`
- `src/layouts/Base.astro`
- `src/components/TrackSelector.astro`
- `src/components/ProjectCard.astro`
- `src/components/SkillList.astro`
- `src/components/Timeline.astro`
- `src/components/GitHubCard.astro`
- `src/pages/index.astro`
- `src/pages/tracks/[track].astro`
- `src/pages/projects/[slug].astro`
- `src/pages/journey.astro`
- `src/pages/colophon.astro`
- `src/pages/404.astro`
- `.github/actions/quality-gate/action.yml`
- `package.json` (scripts)

**Interfaces:**
- Consumes: Collections from Tasks 05 and 06. `rank`, `sortExperience`, `skillsForTrack`, `skillsForProject` from Task 04.
- Produces: From `src/load.ts`: `loadAll()`, `loadSite()`, `loadGitHub()`. From `src/lib/adapt.ts`: `adaptProject`, `adaptExperience`, `adaptSkill`, `refIds`. From `tests/e2e/routes.ts`: `TRACKS`, `PROJECTS`, `WEB_ROUTES`. Test ids: `track-selector`, `project-card`, `skill`, `skills`, `role`, `timeline`, `github-card`, `source`.

**Notes:**
- The owner must have run `sudo npx playwright install-deps chromium`. If Chromium cannot start, stop and report it.
- Browser tests use `wrangler dev`, so build before running them.
- Do not link to the PDFs yet. Task 09 adds those links.
- Keep the `<!doctype html>` and attribute names exactly as shown. The Astro 7 compiler rejects unclosed tags.

- [ ] **Step 1: Start the branch**

````bash
git switch main && git pull && git switch -c task/07-pages
npm ci
````

- [ ] **Step 2: Create the server and browser test configuration**

`wrangler.jsonc`

````jsonc
{
  "$schema": "./node_modules/wrangler/config-schema.json",
  "name": "portfolio",
  "compatibility_date": "2026-11-22",
  "workers_dev": true,
  "assets": {
    "directory": "./dist",
    "not_found_handling": "404-page",
    "html_handling": "auto-trailing-slash"
  }
}
````

`playwright.config.ts`

````ts
import { defineConfig, devices } from '@playwright/test';

const local = 'http://localhost:4321';
const remote = process.env.SMOKE_BASE_URL;

export default defineConfig({
  testDir: 'tests',
  testMatch: ['e2e/**/*.spec.ts', 'a11y/**/*.spec.ts'],
  forbidOnly: Boolean(process.env.CI),
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: remote ?? local, trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: remote
    ? undefined
    : {
        command: 'npx wrangler dev --port 4321',
        url: local,
        env: { WRANGLER_SEND_METRICS: 'false' },
        reuseExistingServer: false,
      },
});
````

````bash
npm pkg set scripts.test:e2e="playwright test --grep-invert @smoke" scripts.test="npm run test:unit && npm run test:e2e"
````

- [ ] **Step 3: Write the failing tests**

`tests/unit/adapt.test.ts`

````ts
import { describe, expect, it } from 'vitest';
import { adaptExperience, adaptProject, adaptSkill } from '../../src/lib/adapt';

const ref = (collection: string, id: string) => ({ collection, id });

describe('adapt', () => {
  it('flattens project references and drops images', () =>
    expect(adaptProject({ id: 'p', data: { title: 'P', tracks: [ref('tracks', 'a')], cover: {}, gallery: [{}] } })).toEqual({
      id: 'p', data: { title: 'P', tracks: ['a'], cover: undefined, gallery: [] },
    }));
  it('flattens experience references', () =>
    expect(adaptExperience({ id: 'e', data: { tracks: [ref('tracks', 'a')], projects: [ref('projects', 'p')] } })).toEqual({
      id: 'e', data: { tracks: ['a'], projects: ['p'] },
    }));
  it('flattens skill references', () =>
    expect(adaptSkill({ id: 's', data: { evidence: [ref('projects', 'p')] } })).toEqual({ id: 's', data: { evidence: ['p'] } }));
});
````

`tests/e2e/routes.ts`

````ts
export const TRACKS = [
  { id: 'nonprofit', title: 'Non-profit work' },
  { id: 'professional', title: 'Day to day role' },
  { id: 'side-projects', title: 'Technical side projects' },
];
export const PROJECTS = [
  'agentsofolympus',
  'charger-firmware-test-automation',
  'emerging-100-event-branding',
  'meridian-sigma',
  'portfolio-website',
];
export const WEB_ROUTES = [
  '/',
  ...TRACKS.map((t) => `/tracks/${t.id}/`),
  ...PROJECTS.map((p) => `/projects/${p}/`),
  '/journey/',
  '/colophon/',
];
````

`tests/e2e/routes.spec.ts`

````ts
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
````

- [ ] **Step 4: Run the tests and confirm they fail**

````bash
npx vitest run tests/unit/adapt.test.ts
npm run build && npx playwright test tests/e2e/routes.spec.ts --project=desktop
````

Expected: failures, because the code does not exist yet.

- [ ] **Step 5: Create the public files**

`public/favicon.svg`

````xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="6" fill="#0b4f9e"/></svg>
````

`public/robots.txt`

````text
User-agent: *
Allow: /
````

- [ ] **Step 6: Create the library code, layout, components and pages**

`src/lib/adapt.ts`

````ts
import type { Entry } from './schemas';

interface Ref {
  id: string;
}

/** Astro references are { collection, id }. The pure functions use plain ids. */
export const refIds = (refs: Ref[]): string[] => refs.map((r) => r.id);

export function adaptProject<T extends { tracks: Ref[] }>(entry: Entry<T>) {
  return { id: entry.id, data: { ...entry.data, tracks: refIds(entry.data.tracks), cover: undefined, gallery: [] } };
}

export function adaptExperience<T extends { tracks: Ref[]; projects: Ref[] }>(entry: Entry<T>) {
  const { data } = entry;
  return { id: entry.id, data: { ...data, tracks: refIds(data.tracks), projects: refIds(data.projects) } };
}

export function adaptSkill<T extends { evidence: Ref[] }>(entry: Entry<T>) {
  return { id: entry.id, data: { ...entry.data, evidence: refIds(entry.data.evidence) } };
}
````

`src/load.ts`

````ts
import { getCollection, getEntry, type CollectionEntry } from 'astro:content';
import { adaptExperience, adaptProject, adaptSkill } from './lib/adapt';
import { compareDates } from './lib/dates';
import { sortExperience } from './lib/rank';

async function one<C extends 'site' | 'github'>(collection: C, id: string) {
  const entry = await getEntry(collection, id);
  if (!entry) throw new Error(`Missing ${collection} data`);
  return entry.data as CollectionEntry<C>['data'];
}

export const loadSite = () => one('site', 'site');
export const loadGitHub = () => one('github', 'snapshot');

/** Every collection as plain, sorted data. Drafts are removed. */
export async function loadAll() {
  const projectEntries = (await getCollection('projects')).filter((p) => !p.data.draft);
  const tracks = (await getCollection('tracks')).sort((a, b) => a.data.order - b.data.order);
  const milestones = (await getCollection('milestones')).sort((a, b) =>
    compareDates(a.data.date, b.data.date),
  );
  return {
    projectEntries,
    projects: projectEntries.map(adaptProject),
    experience: sortExperience((await getCollection('experience')).map(adaptExperience)),
    skills: (await getCollection('skills')).map(adaptSkill),
    milestones,
    tracks,
  };
}
````

`src/styles/global.css`

````css
:root { color-scheme: light; --text: #1a1a1a; --muted: #4a4a4a; --link: #0b4f9e; --line: #d0d0d0; }
* { box-sizing: border-box; }
body { margin: 0 auto; max-width: 46rem; padding: 0 1rem 3rem; background: #fff; color: var(--text); font: 1rem/1.6 system-ui, sans-serif; }
a { color: var(--link); }
img { max-width: 100%; height: auto; }
h1, h2, h3 { line-height: 1.25; }
header, footer { padding: 1rem 0; border-bottom: 1px solid var(--line); }
footer { border: 0; border-top: 1px solid var(--line); margin-top: 3rem; }
nav ul, .tracks { display: flex; flex-wrap: wrap; gap: 0.5rem 1.25rem; list-style: none; margin: 0; padding: 0; }
.muted { color: var(--muted); }
.card { border: 1px solid var(--line); border-radius: 0.5rem; margin: 1rem 0; padding: 1rem; }
.card h3 { margin-top: 0; }
.skip { position: absolute; left: -999px; }
.skip:focus { left: 1rem; top: 1rem; background: #fff; padding: 0.5rem; }
````

`src/layouts/Base.astro`

````astro
---
import '../styles/global.css';
import { loadAll, loadSite } from '../load';

interface Props {
  title?: string;
  description: string;
}
const { title, description } = Astro.props;
const site = await loadSite();
const { tracks } = await loadAll();
---

<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content={description} />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <title>{title ? `${title} | ${site.name}` : site.name}</title>
  </head>
  <body>
    <a class="skip" href="#main">Skip to content</a>
    <header>
      <nav aria-label="Main">
        <ul>
          <li><a href="/">Home</a></li>
          {tracks.map((t) => <li><a href={`/tracks/${t.id}/`}>{t.data.title}</a></li>)}
          <li><a href="/journey/">Journey</a></li>
          <li><a href="/colophon/">Colophon</a></li>
        </ul>
      </nav>
    </header>
    <main id="main"><slot /></main>
    <footer>
      <a href={site.github}>GitHub</a>{' '}<a href={site.linkedin}>LinkedIn</a>
    </footer>
  </body>
</html>
````

`src/components/TrackSelector.astro`

````astro
---
import type { CollectionEntry } from 'astro:content';

interface Props {
  tracks: CollectionEntry<'tracks'>[];
}
const { tracks } = Astro.props;
---

<ul class="tracks" data-testid="track-selector">
  {tracks.map((t) => <li><a href={`/tracks/${t.id}/`}>{t.data.title}</a></li>)}
</ul>
````

`src/components/ProjectCard.astro`

````astro
---
import type { CollectionEntry } from 'astro:content';
import { formatPeriod } from '../lib/dates';

interface Props {
  project: CollectionEntry<'projects'>;
}
const { project } = Astro.props;
const { data } = project;
---

<article class="card" data-testid="project-card">
  <h3><a href={`/projects/${project.id}/`}>{data.title}</a></h3>
  <p class="muted">{formatPeriod(data.period)}</p>
  <p>{data.summary}</p>
</article>
````

`src/components/SkillList.astro`

````astro
---
import type { SkillWithEvidence } from '../lib/evidence';

interface Props {
  skills: SkillWithEvidence[];
}
const { skills } = Astro.props;
---

<ul data-testid="skills">
  {
    skills.map(({ skill, projects }) => (
      <li data-testid="skill">
        {skill.data.name}
        <ul>
          {projects.map((p) => <li><a href={`/projects/${p.id}/`}>{p.data.title}</a></li>)}
        </ul>
      </li>
    ))
  }
</ul>
````

`src/components/Timeline.astro`

````astro
---
import type { CollectionEntry } from 'astro:content';
import { formatDate } from '../lib/dates';

interface Props {
  milestones: CollectionEntry<'milestones'>[];
}
const { milestones } = Astro.props;
---

<ol data-testid="timeline">
  {
    milestones.map(({ data }) => (
      <li>
        <p class="muted">{formatDate(data.date)}</p>
        <p>{data.title}</p>
        {data.detail && <p>{data.detail}</p>}
      </li>
    ))
  }
</ol>
````

`src/components/GitHubCard.astro`

````astro
---
import { loadGitHub } from '../load';

interface Props {
  repo: string;
}
const { repo } = Astro.props;
const data = (await loadGitHub()).repos[repo];
---

{
  data ? (
    <section class="card" data-testid="github-card">
      <h2><a href={data.url}>{data.nameWithOwner}</a></h2>
      {data.description && <p>{data.description}</p>}
      <dl>
        {data.languages.length > 0 && <><dt>Languages</dt><dd>{data.languages.join(', ')}</dd></>}
        <dt>Stars</dt><dd>{data.stargazerCount}</dd>
        {data.lastCommit && <><dt>Last commit</dt><dd>{data.lastCommit.slice(0, 10)}</dd></>}
        <dt>Checks</dt><dd>{data.status.toLowerCase()}</dd>
      </dl>
      {data.isArchived && <p>This repository is archived.</p>}
    </section>
  ) : (
    <p><a href={`https://github.com/${repo}`}>{repo} on GitHub</a></p>
  )
}
````

`src/pages/index.astro`

````astro
---
import ProjectCard from '../components/ProjectCard.astro';
import TrackSelector from '../components/TrackSelector.astro';
import Base from '../layouts/Base.astro';
import { rank } from '../lib/rank';
import { loadAll, loadSite } from '../load';

const site = await loadSite();
const { projectEntries, projects, tracks } = await loadAll();
const track = tracks.find((t) => t.data.default);
if (!track) throw new Error('No default track');

const ranked = rank(projects, track.id);
const featured = ranked.filter((p) => p.data.featured);
const ids = (featured.length > 0 ? featured : ranked.slice(0, 3)).map((p) => p.id);
const shown = ids.flatMap((id) => projectEntries.filter((p) => p.id === id));
---

<Base description={site.headline}>
  <h1>{site.name}</h1>
  <p>{site.headline}</p>
  <h2>Choose a track</h2>
  <TrackSelector tracks={tracks} />
  <h2>{track.data.title}</h2>
  {shown.map((p) => <ProjectCard project={p} />)}
</Base>
````

`src/pages/tracks/[track].astro`

````astro
---
import type { CollectionEntry } from 'astro:content';
import ProjectCard from '../../components/ProjectCard.astro';
import SkillList from '../../components/SkillList.astro';
import Base from '../../layouts/Base.astro';
import { formatPeriod } from '../../lib/dates';
import { skillsForTrack } from '../../lib/evidence';
import { rank } from '../../lib/rank';
import { loadAll } from '../../load';

export async function getStaticPaths() {
  const { tracks } = await loadAll();
  return tracks.map((track) => ({ params: { track: track.id }, props: { track } }));
}
interface Props {
  track: CollectionEntry<'tracks'>;
}
const { track } = Astro.props;
const { projectEntries, projects, experience, skills } = await loadAll();
const ranked = rank(projects, track.id).flatMap((r) => projectEntries.filter((p) => p.id === r.id));
const trackSkills = skillsForTrack(skills, projects, track.id);
const roles = experience.filter((e) => e.data.tracks.includes(track.id));
const title = (id: string) => projects.find((p) => p.id === id)?.data.title ?? id;
---

<Base title={track.data.title} description={track.data.description}>
  <h1>{track.data.title}</h1>
  <p>{track.data.headline}</p>
  <p>{track.data.description}</p>
  <h2>Projects</h2>
  {ranked.map((p) => <ProjectCard project={p} />)}
  {trackSkills.length > 0 && <h2>Skills</h2>}
  {trackSkills.length > 0 && <SkillList skills={trackSkills} />}
  {roles.length > 0 && <h2>Experience</h2>}
  {
    roles.map(({ data }) => (
      <article data-testid="role">
        <h3>{data.title}</h3>
        <p>{data.organization}</p>
        <p class="muted">{formatPeriod(data)}</p>
        <ul>{data.highlights.map((h) => <li>{h}</li>)}</ul>
        {data.projects.length > 0 && (
          <ul>{data.projects.map((id) => <li><a href={`/projects/${id}/`}>{title(id)}</a></li>)}</ul>
        )}
      </article>
    ))
  }
</Base>
````

`src/pages/projects/[slug].astro`

````astro
---
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
  {data.demo && <p><a href={data.demo}>Live demo</a></p>}
  {data.repo && <GitHubCard repo={data.repo} />}
</Base>
````

`src/pages/journey.astro`

````astro
---
import Timeline from '../components/Timeline.astro';
import Base from '../layouts/Base.astro';
import { loadAll, loadSite } from '../load';

const site = await loadSite();
const { milestones } = await loadAll();
---

<Base title="Journey" description={`Career and education milestones of ${site.name}`}>
  <h1>Journey</h1>
  <Timeline milestones={milestones} />
</Base>
````

`src/pages/colophon.astro`

````astro
---
import Base from '../layouts/Base.astro';
import { loadGitHub } from '../load';

const { fetchedAt, source } = await loadGitHub();
---

<Base title="Colophon" description="How this site is built and tested">
  <h1>Colophon</h1>
  <p>This site is generated by Astro and served as static files by Cloudflare Workers.</p>
  <p>Data refreshed: <time datetime={fetchedAt}>{fetchedAt}</time> (source: <span data-testid="source">{source}</span>)</p>
</Base>
````

`src/pages/404.astro`

````astro
---
import Base from '../layouts/Base.astro';
---

<Base title="Page not found" description="Page not found">
  <h1>Page not found</h1>
  <p><a href="/">Go to the home page</a></p>
</Base>
````

- [ ] **Step 7: Add browser tests to the gate (gate G6)**

`.github/actions/quality-gate/action.yml`

````yaml
name: Quality gate
description: Every automated check. Pull requests and deploys both run this.
inputs:
  github-token:
    description: Token for the GitHub GraphQL API. Empty means fixture data.
    default: ''
  site-url:
    description: Public URL of the site. Empty means a placeholder.
    default: ''
runs:
  using: composite
  steps:
    - uses: actions/setup-node@v7.1.0
      with:
        node-version-file: .nvmrc
        cache: npm
    - name: G1 install
      shell: bash
      run: npm ci
    - name: Audit report (does not block)
      shell: bash
      run: npm audit --audit-level=high || echo "::warning::npm audit found high severity issues"
    - name: G2 type check
      shell: bash
      run: npm run check
    - name: G3 and G4 unit tests and coverage
      shell: bash
      run: npm run test:unit
    - name: G5 content integrity and build
      shell: bash
      env:
        GH_GRAPHQL_TOKEN: ${{ inputs.github-token }}
        SITE_URL: ${{ inputs.site-url }}
      run: npm run build
    - name: Install Chromium
      shell: bash
      run: npx playwright install --with-deps chromium
    - name: G6 browser tests
      shell: bash
      run: npm run test:e2e
    - name: Upload the test report
      if: failure()
      uses: actions/upload-artifact@v7.0.2
      with:
        name: playwright-report-${{ github.run_attempt }}
        path: playwright-report/
        if-no-files-found: ignore
````

- [ ] **Step 8: Run every gate**

````bash
npm run check
npm run test:unit
npm run build
npm run test:e2e
````

Expected: every command exits 0, with 0 type errors and no failing or skipped test. If one fails, fix your own work. Never change a test, threshold or gate to make it pass.

- [ ] **Step 9: Commit, push and open the PR**

````bash
git add .github package-lock.json package.json playwright.config.ts public src tests wrangler.jsonc
git status --short
git commit -m "feat: add pages and route tests"
git push -u origin task/07-pages
gh pr create --base main --title "feat: add pages and route tests" --body-file - <<'EOF'
## Built

## Gate output

## Defaults relied on

## Open questions

EOF
````

Fill in every section of the PR body first. If `gh` is unavailable, report the compare URL.

- [ ] **Step 10: Stop**

Do not merge and do not start the next task. The owner runs the Opus review and merges.
