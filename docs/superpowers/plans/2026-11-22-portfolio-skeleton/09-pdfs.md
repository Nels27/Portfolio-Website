# Task 09: Résumé and CV PDFs

> **For agentic workers:** REQUIRED SUB-SKILL: use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax. Read [00-overview.md](00-overview.md) and the Known traps and Guardrails in [CONTEXT.md](../../../../CONTEXT.md) first. Do only this task.

**Goal:** One résumé PDF per track and one combined CV, generated from the same content and tested.

**Branch:** `task/09-pdfs`

**Files:**
- `tests/e2e/pdfs.spec.ts`
- `tests/e2e/routes.ts`
- `tests/e2e/assets.spec.ts`
- `src/styles/print.css`
- `src/layouts/Print.astro`
- `src/components/PrintRoles.astro`
- `src/components/PrintProjects.astro`
- `src/components/PrintMilestones.astro`
- `src/pages/resume/[track].astro`
- `src/pages/cv.astro`
- `scripts/render-pdfs.ts`
- `src/pages/tracks/[track].astro`
- `src/pages/journey.astro`
- `.github/actions/quality-gate/action.yml`
- `package.json` (scripts)

**Interfaces:**
- Consumes: `loadAll()` and `loadSite()` from Task 07. `loadContent(root)` from Task 03. `skillsWithEvidence` from Task 04.
- Produces: Routes `/resume/<track>/` and `/cv/`. Files `dist/resume/<track>.pdf` and `dist/cv.pdf`. `PRINT_ROUTES` and `ALL_ROUTES` in `tests/e2e/routes.ts`.

**Notes:**
- From now on, run `npm run pdf` after every `npm run build`. A build clears `dist/`, and the link tests need the PDFs.
- Use Astro’s `preview()` function, never the `astro preview` command.

- [ ] **Step 1: Start the branch**

````bash
git switch main && git pull && git switch -c task/09-pdfs
npm ci
````

- [ ] **Step 2: Write the failing tests**

`tests/e2e/pdfs.spec.ts`

````ts
import { expect, test } from '@playwright/test';
import { extractText, getDocumentProxy } from 'unpdf';
import { PRINT_ROUTES, PROJECTS, TRACKS, WEB_ROUTES } from './routes';

const EMAIL = 'NelsonRaphael24@outlook.com';
const ROLES: Record<string, string[]> = {
  nonprofit: [],
  professional: [
    'Test Architect',
    'Test Engineer',
    'Embedded Software Engineer',
    'eMobility Early Career Experience Program',
  ],
  'side-projects': [],
};
const PROJECT_TITLES = [
  'Emerging 100 Event Branding',
  'Charger Firmware Test Automation',
  'Portfolio Website',
  'AgentsOfOlympus',
  'Meridian-Sigma',
];
const pdfs = [...TRACKS.map((t) => `/resume/${t.id}.pdf`), '/cv.pdf'];

async function read(body: Buffer) {
  const pdf = await getDocumentProxy(new Uint8Array(body));
  const { text, totalPages } = await extractText(pdf, { mergePages: true });
  return { pdf, totalPages, text: text.replace(/\s+/g, ' ') };
}

for (const url of pdfs) {
  test(`${url} is a readable US Letter PDF without images`, async ({ request }) => {
    const response = await request.get(url);
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('application/pdf');
    const body = await response.body();
    const { pdf, text } = await read(body);
    expect(text).toContain('Nelson Raphael');
    expect(text).toContain(EMAIL);
    const [, , width, height] = (await pdf.getPage(1)).view;
    expect([Math.round(width), Math.round(height)]).toEqual([612, 792]);
    expect(body.toString('latin1')).not.toMatch(/\/Subtype\s*\/Image/);
  });
}

for (const { id } of TRACKS) {
  test(`the ${id} résumé fits 2 pages and lists its roles in order`, async ({ request }) => {
    const { text, totalPages } = await read(await (await request.get(`/resume/${id}.pdf`)).body());
    expect(totalPages).toBeLessThanOrEqual(2);
    let position = -1;
    for (const title of ROLES[id]) {
      const next = text.indexOf(title, position + 1);
      expect(next, title).toBeGreaterThan(position);
      position = next;
    }
    if (ROLES[id].length === 0) expect(text).not.toContain('Experience');
  });
}

test('the CV lists every project heading exactly once, by track', async ({ page, request }) => {
  await page.goto('/cv/');
  await expect(page.getByTestId('project').locator('h3')).toHaveText(PROJECT_TITLES);
  expect(PROJECT_TITLES).toHaveLength(PROJECTS.length);
  const { text } = await read(await (await request.get('/cv.pdf')).body());
  for (const title of PROJECT_TITLES) expect(text).toContain(title);
});

for (const route of PRINT_ROUTES) {
  test(`${route} has no images and only approved contact details`, async ({ page }) => {
    expect((await page.goto(route))?.status()).toBe(200);
    await expect(page.locator('img, picture, svg')).toHaveCount(0);
    const items = await page.getByTestId('contact').locator('li').allTextContents();
    expect(items[0]).toBe(EMAIL);
    expect(items).toContain('linkedin.com/in/nelsonraphael278');
    expect(items).toContain('github.com/Nels27');
    expect(items.length).toBeLessThanOrEqual(4);
  });
}

for (const route of WEB_ROUTES) {
  test(`${route} does not show the email`, async ({ request }) => {
    expect(await (await request.get(route)).text()).not.toContain(EMAIL);
  });
}
````

In `tests/e2e/routes.ts`, replace:

````ts
  '/colophon/',
];
````

with:

````ts
  '/colophon/',
];
export const PRINT_ROUTES = [...TRACKS.map((t) => `/resume/${t.id}/`), '/cv/'];
export const ALL_ROUTES = [...WEB_ROUTES, ...PRINT_ROUTES];
````

In `tests/e2e/assets.spec.ts`, replace:

````ts
import { WEB_ROUTES }
````

with:

````ts
import { ALL_ROUTES }
````

In `tests/e2e/assets.spec.ts`, replace:

````ts
of WEB_ROUTES)
````

with:

````ts
of ALL_ROUTES)
````

- [ ] **Step 3: Run the tests and confirm they fail**

````bash
npm run build && npx playwright test tests/e2e/pdfs.spec.ts --project=desktop
````

Expected: failures, because the code does not exist yet.

- [ ] **Step 4: Create the print styles, layout, components and pages**

`src/styles/print.css`

````css
@page { size: letter; margin: 0.6in; }
:root { color-scheme: light; }
body { margin: 0 auto; max-width: 7.3in; background: #fff; color: #000; font: 10.5pt/1.35 system-ui, sans-serif; }
a { color: #0b4f9e; }
h1 { margin: 0; font-size: 20pt; }
h2 { margin: 12pt 0 4pt; border-bottom: 1px solid #555; font-size: 13pt; }
h3 { margin: 6pt 0 0; font-size: 11pt; }
p, ul { margin: 2pt 0; }
h2, h3 { break-after: avoid; }
article { break-inside: avoid; }
.contact { list-style: none; padding: 0; display: flex; flex-wrap: wrap; gap: 2pt 12pt; }
````

`src/layouts/Print.astro`

````astro
---
import '../styles/print.css';
import { loadSite } from '../load';

interface Props {
  title: string;
  description: string;
}
const { title, description } = Astro.props;
const site = await loadSite();
const website = process.env.SITE_URL;
const links = [site.linkedin, ...(website ? [website] : []), site.github];
---

<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content={description} />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <title>{`${title} | ${site.name}`}</title>
  </head>
  <body>
    <main>
      <h1>{site.name}</h1>
      <ul class="contact" data-testid="contact">
        <li>{site.email}</li>
        {links.map((url) => <li><a href={url}>{url.replace(/^https:\/\/(?:www\.)?/, '').replace(/\/$/, '')}</a></li>)}
      </ul>
      <slot />
    </main>
  </body>
</html>
````

`src/components/PrintRoles.astro`

````astro
---
import { formatPeriod } from '../lib/dates';
import type { Entry, ExperienceData } from '../lib/schemas';

interface Props {
  roles: Entry<ExperienceData>[];
}
const { roles } = Astro.props;
---

{roles.length > 0 && <h2>Experience</h2>}
{
  roles.map(({ data }) => (
    <article data-testid="role">
      <h3>{data.title}</h3>
      <p>{data.organization} | {formatPeriod(data)}{data.location && ` | ${data.location}`}</p>
      <ul>{data.highlights.map((h) => <li>{h}</li>)}</ul>
    </article>
  ))
}
````

`src/components/PrintProjects.astro`

````astro
---
import { formatPeriod } from '../lib/dates';
import type { Entry, ProjectData } from '../lib/schemas';

interface Props {
  heading: string;
  projects: Entry<ProjectData>[];
}
const { heading, projects } = Astro.props;
---

{projects.length > 0 && <h2>{heading}</h2>}
{
  projects.map(({ data }) => (
    <article data-testid="project">
      <h3>{data.title}</h3>
      <p>{data.role} | {formatPeriod(data.period)} | {data.stack.join(', ')}</p>
      <ul>{data.outcomes.map((o) => <li>{o}</li>)}</ul>
    </article>
  ))
}
````

`src/components/PrintMilestones.astro`

````astro
---
import type { CollectionEntry } from 'astro:content';
import { formatDate } from '../lib/dates';

interface Props {
  heading: string;
  milestones: CollectionEntry<'milestones'>[];
}
const { heading, milestones } = Astro.props;
---

{milestones.length > 0 && <h2>{heading}</h2>}
{
  milestones.map(({ data }) => (
    <article data-testid="milestone">
      <h3>{data.title}</h3>
      <p>{formatDate(data.date)}{data.detail && ` | ${data.detail}`}</p>
    </article>
  ))
}
````

`src/pages/resume/[track].astro`

````astro
---
import type { CollectionEntry } from 'astro:content';
import PrintMilestones from '../../components/PrintMilestones.astro';
import PrintProjects from '../../components/PrintProjects.astro';
import PrintRoles from '../../components/PrintRoles.astro';
import Print from '../../layouts/Print.astro';
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
const { projects, experience, skills, milestones } = await loadAll();
const trackSkills = skillsForTrack(skills, projects, track.id);
const roles = experience.filter((e) => e.data.tracks.includes(track.id));
const education = milestones.filter((m) => m.data.kind === 'education');
---

<Print title={`Résumé: ${track.data.title}`} description={track.data.description}>
  <p>{track.data.headline}</p>
  <PrintRoles roles={roles} />
  <PrintProjects heading="Projects" projects={rank(projects, track.id)} />
  {trackSkills.length > 0 && <h2>Skills</h2>}
  {trackSkills.length > 0 && <p>{trackSkills.map((s) => s.skill.data.name).join(', ')}</p>}
  <PrintMilestones heading="Education" milestones={education} />
</Print>
````

`src/pages/cv.astro`

````astro
---
import PrintMilestones from '../components/PrintMilestones.astro';
import PrintProjects from '../components/PrintProjects.astro';
import PrintRoles from '../components/PrintRoles.astro';
import Print from '../layouts/Print.astro';
import { skillsWithEvidence } from '../lib/evidence';
import { rank } from '../lib/rank';
import { SKILL_CATEGORIES } from '../lib/schemas';
import { loadAll, loadSite } from '../load';

const CATEGORY_NAMES: Record<(typeof SKILL_CATEGORIES)[number], string> = {
  languages: 'Languages',
  testing: 'Testing',
  infrastructure: 'Infrastructure',
  'ai-ml': 'AI and machine learning',
  hardware: 'Hardware',
  leadership: 'Leadership',
};
const site = await loadSite();
const { projects, experience, skills, milestones, tracks } = await loadAll();

// A project in several tracks appears once, under its lowest-order track.
const firstTrack = (trackIds: string[]) => tracks.find((t) => trackIds.includes(t.id))?.id;
const groups = tracks.map((t) => ({
  heading: `Projects: ${t.data.title}`,
  projects: rank(projects, t.id).filter((p) => firstTrack(p.data.tracks) === t.id),
}));
const proven = skillsWithEvidence(skills, projects);
const categories = SKILL_CATEGORIES.map((category) => ({
  name: CATEGORY_NAMES[category],
  skills: proven.filter((s) => s.skill.data.category === category).map((s) => s.skill.data.name),
})).filter((c) => c.skills.length > 0);
const ofKind = (kind: string) => milestones.filter((m) => m.data.kind === kind);
---

<Print title="Curriculum vitae" description={`Curriculum vitae of ${site.name}`}>
  <p>{site.headline}</p>
  <PrintRoles roles={experience} />
  {groups.map((g) => <PrintProjects heading={g.heading} projects={g.projects} />)}
  {categories.length > 0 && <h2>Skills</h2>}
  {categories.map((c) => <p>{c.name}: {c.skills.join(', ')}</p>)}
  <PrintMilestones heading="Education" milestones={ofKind('education')} />
  <PrintMilestones heading="Certifications" milestones={ofKind('certification')} />
</Print>
````

- [ ] **Step 5: Create the PDF script**

`scripts/render-pdfs.ts`

````ts
import { mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { preview } from 'astro';
import { loadContent } from './lib/content';

const { content } = await loadContent('.');
const pages = [
  ...content.tracks.map((t) => ({ url: `/resume/${t.id}/`, file: `dist/resume/${t.id}.pdf` })),
  { url: '/cv/', file: 'dist/cv.pdf' },
];

// Use the API, not the CLI: Astro runs the CLI in the background when an AI agent starts it.
const server = await preview({ server: { port: 4329 }, logLevel: 'error' });
try {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await mkdir('dist/resume', { recursive: true });
    for (const { url, file } of pages) {
      const response = await page.goto(`http://localhost:${server.port}${url}`);
      if (response?.status() !== 200) throw new Error(`${url} returned ${response?.status()}`);
      await page.pdf({ path: file, preferCSSPageSize: true, printBackground: true });
      console.log(`Wrote ${file}`);
    }
  } finally {
    await browser.close();
  }
} finally {
  await server.stop();
}
````

````bash
npm pkg set scripts.pdf="tsx scripts/render-pdfs.ts"
````

- [ ] **Step 6: Link to the PDFs**

In `src/pages/tracks/[track].astro`, replace:

````astro
  <p>{track.data.description}</p>
````

with:

````astro
  <p>{track.data.description}</p>
  <p><a href={`/resume/${track.id}.pdf`}>Résumé for this track (PDF)</a></p>
````

In `src/pages/journey.astro`, replace:

````astro
  <Timeline milestones={milestones} />
````

with:

````astro
  <Timeline milestones={milestones} />
  <p><a href="/cv.pdf">Full CV (PDF)</a></p>
````

- [ ] **Step 7: Add PDFs to the gate (gate G7)**

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
    - name: G7 PDFs
      shell: bash
      run: npm run pdf
    - name: G6 and G7 browser and PDF tests
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
npm run pdf
npm run test:e2e
````

Expected: every command exits 0, with 0 type errors and no failing or skipped test. If one fails, fix your own work. Never change a test, threshold or gate to make it pass.

- [ ] **Step 9: Commit, push and open the PR**

````bash
git add .github package-lock.json package.json scripts src tests
git status --short
git commit -m "feat: generate résumé and CV PDFs"
git push -u origin task/09-pdfs
gh pr create --base main --title "feat: generate résumé and CV PDFs" --body-file - <<'EOF'
## Built

## Gate output

## Defaults relied on

## Open questions

EOF
````

Fill in every section of the PR body first. If `gh` is unavailable, report the compare URL.

- [ ] **Step 10: Stop**

Do not merge and do not start the next task. The owner runs the Opus review and merges.
