# Task 02: Schemas and dates

> **For agentic workers:** REQUIRED SUB-SKILL: use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax. Read [00-overview.md](00-overview.md) and the Known traps and Guardrails in [CONTEXT.md](../../../../CONTEXT.md) first. Do only this task.

**Goal:** Typed, tested field rules for all content, plus date formatting and sorting.

**Branch:** `task/02-schemas-dates`

**Files:**
- `tests/unit/schemas.test.ts`
- `tests/unit/dates.test.ts`
- `src/lib/schemas.ts`
- `src/lib/dates.ts`
- `vitest.config.ts`
- `.github/actions/quality-gate/action.yml`

**Interfaces:**
- Consumes: Task 01 toolchain.
- Produces: From `src/lib/schemas.ts`: `Entry<T>`, `SKILL_CATEGORIES`, every schema, and their inferred types. From `src/lib/dates.ts`: `isPlaceholderDate(d)`, `compareDates(a, b)`, `formatDate(d)`, `formatPeriod({ start, end? })`.

**Notes:**
- Do not add `.refine()` or `.superRefine()` to any object schema. Zod throws when a refined object is extended.

- [ ] **Step 1: Start the branch**

````bash
git switch main && git pull && git switch -c task/02-schemas-dates
npm ci
````

- [ ] **Step 2: Write the failing tests**

`tests/unit/schemas.test.ts`

````ts
import { describe, expect, it } from 'vitest';
import {
  dateSchema, experienceSchema, githubSnapshotSchema, milestoneSchema, projectSchema, siteSchema,
  skillSchema, trackSchema,
} from '../../src/lib/schemas';

const project = {
  title: 'T', summary: 'S', tracks: ['a'], role: 'R', period: { start: '2025-01' },
  stack: ['x'], outcomes: ['y'],
};
const ok = (schema: { safeParse(v: unknown): { success: boolean } }, value: unknown) =>
  schema.safeParse(value).success;

describe('dateSchema', () => {
  it.each(['2026-01', '2026-12', 'TODO(owner): start date'])('accepts %s', (d) => expect(ok(dateSchema, d)).toBe(true));
  it.each(['2026-00', '2026-13', '2026-1', '2026', '2026-01-02', 'TBD', ''])('rejects "%s"', (d) =>
    expect(ok(dateSchema, d)).toBe(false));
});

describe('projectSchema', () => {
  it('accepts a minimal project and applies defaults', () => {
    expect(projectSchema.parse(project)).toMatchObject({
      featured: false, confidential: false, draft: false, gallery: [],
    });
  });
  it.each([
    ['summary over 160 characters', { summary: 'x'.repeat(161) }],
    ['no tracks', { tracks: [] }],
    ['no stack', { stack: [] }],
    ['no outcomes', { outcomes: [] }],
    ['repo without owner', { repo: 'name' }],
    ['http demo', { demo: 'http://example.com' }],
    ['missing title', { title: undefined }],
  ])('rejects %s', (_name, change) => expect(ok(projectSchema, { ...project, ...change })).toBe(false));
  it('accepts a 160 character summary', () =>
    expect(ok(projectSchema, { ...project, summary: 'x'.repeat(160) })).toBe(true));
  it('can be extended', () => expect(() => projectSchema.extend({ cover: projectSchema.shape.title })).not.toThrow());
});

describe('other schemas', () => {
  it('requires experience highlights', () =>
    expect(ok(experienceSchema, { organization: 'O', title: 'T', tracks: ['a'], start: '2025-01', highlights: [] })).toBe(false));
  it('requires skill evidence', () =>
    expect(ok(skillSchema, { id: 's', name: 'S', category: 'testing', evidence: [] })).toBe(false));
  it('rejects an unknown skill category', () =>
    expect(ok(skillSchema, { id: 's', name: 'S', category: 'magic', evidence: ['p'] })).toBe(false));
  it('rejects a milestone id that is not a slug', () =>
    expect(ok(milestoneSchema, { id: 'Not A Slug', date: '2025-01', title: 'T', kind: 'career' })).toBe(false));
  it('rejects a track headline over 90 characters', () =>
    expect(ok(trackSchema, { id: 't', title: 'T', headline: 'x'.repeat(91), description: 'D', order: 1 })).toBe(false));
  it('rejects an invalid site email', () =>
    expect(ok(siteSchema, { name: 'N', headline: 'H', email: 'nope', github: 'https://a.co', linkedin: 'https://b.co' })).toBe(false));
  it('accepts nullable GitHub fields', () =>
    expect(ok(githubSnapshotSchema, {
      fetchedAt: 'x', source: 'fixture',
      repos: { 'a/b': { nameWithOwner: 'a/b', description: null, url: 'https://github.com/a/b', homepageUrl: null,
        primaryLanguage: null, languages: [], stargazerCount: 0, pushedAt: null, isArchived: false, lastCommit: null, status: 'none' } },
    })).toBe(true));
});
````

`tests/unit/dates.test.ts`

````ts
import { describe, expect, it } from 'vitest';
import { compareDates, formatDate, formatPeriod, isPlaceholderDate } from '../../src/lib/dates';

const TBD = 'TODO(owner): start date';

describe('dates', () => {
  it('detects placeholders', () => {
    expect(isPlaceholderDate(TBD)).toBe(true);
    expect(isPlaceholderDate('2026-01')).toBe(false);
  });
  it('sorts ascending with placeholders oldest', () => {
    expect(['2026-03', TBD, '2019-05', '2026-01'].sort(compareDates)).toEqual([TBD, '2019-05', '2026-01', '2026-03']);
    expect(compareDates('2026-01', '2026-01')).toBe(0);
    expect(compareDates(TBD, 'TODO(owner): other')).toBe(0);
  });
  it.each([['2026-01', 'Jan 2026'], ['2026-03', 'Mar 2026'], ['2019-12', 'Dec 2019'], [TBD, 'Date TBD']])(
    'formats %s as %s', (input, expected) => expect(formatDate(input)).toBe(expected));
  it('formats periods', () => {
    expect(formatPeriod({ start: '2022-01' })).toBe('Jan 2022 – Present');
    expect(formatPeriod({ start: '2022-01', end: '2026-01' })).toBe('Jan 2022 – Jan 2026');
    expect(formatPeriod({ start: TBD })).toBe('Date TBD – Present');
  });
});
````

- [ ] **Step 3: Run the tests and confirm they fail**

````bash
npx vitest run tests/unit/schemas.test.ts tests/unit/dates.test.ts
````

Expected: failures, because the code does not exist yet.

- [ ] **Step 4: Implement the schemas and dates**

`src/lib/schemas.ts`

````ts
import { z } from 'astro/zod';

// No .refine()/.superRefine() on object schemas here: content.config.ts extends
// them, and Zod throws when a refined object is extended. Cross-field rules
// live in integrity.ts.

export interface Entry<T> {
  id: string;
  data: T;
}

export const SKILL_CATEGORIES = [
  'languages',
  'testing',
  'infrastructure',
  'ai-ml',
  'hardware',
  'leadership',
] as const;

const text = z.string().min(1);
const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const httpsUrl = z.url({ protocol: /^https$/ });

export const dateSchema = z
  .string()
  .regex(/^(?:\d{4}-(?:0[1-9]|1[0-2])$|TODO\(owner\))/, 'Expected YYYY-MM or a TODO(owner) placeholder');

export const projectSchema = z.object({
  title: text,
  summary: text.max(160),
  tracks: z.array(z.string()).min(1),
  role: text,
  period: z.object({ start: dateSchema, end: dateSchema.optional() }),
  stack: z.array(text).min(1),
  outcomes: z.array(text).min(1),
  repo: z.string().regex(/^[\w.-]+\/[\w.-]+$/).optional(),
  demo: httpsUrl.optional(),
  featured: z.boolean().default(false),
  confidential: z.boolean().default(false),
  draft: z.boolean().default(false),
  cover: z.string().optional(),
  coverAlt: z.string().optional(),
  gallery: z
    .array(z.object({ src: z.string(), alt: z.string(), caption: z.string().optional() }))
    .default([]),
});

export const experienceSchema = z.object({
  organization: text,
  title: text,
  tracks: z.array(z.string()).min(1),
  start: dateSchema,
  end: dateSchema.optional(),
  location: z.string().optional(),
  highlights: z.array(text).min(1),
  projects: z.array(z.string()).default([]),
});

export const skillSchema = z.object({
  id: slug,
  name: text,
  category: z.enum(SKILL_CATEGORIES),
  evidence: z.array(z.string()).min(1),
});

export const milestoneSchema = z.object({
  id: slug,
  date: dateSchema,
  title: text,
  kind: z.enum(['education', 'career', 'community', 'certification', 'project']),
  detail: z.string().optional(),
});

export const trackSchema = z.object({
  id: slug,
  title: text,
  headline: text.max(90),
  description: text,
  order: z.number().int(),
  default: z.boolean().default(false),
});

export const siteSchema = z.object({
  name: text,
  headline: text,
  email: z.email(),
  github: httpsUrl,
  linkedin: httpsUrl,
});

export const githubRepoSchema = z.object({
  nameWithOwner: text,
  description: z.string().nullable(),
  url: httpsUrl,
  homepageUrl: z.string().nullable(),
  primaryLanguage: z.string().nullable(),
  languages: z.array(z.string()),
  stargazerCount: z.number().int(),
  pushedAt: z.string().nullable(),
  isArchived: z.boolean(),
  lastCommit: z.string().nullable(),
  status: z.string(),
});

export const githubSnapshotSchema = z.object({
  fetchedAt: z.string(),
  source: z.enum(['live', 'cache', 'fixture']),
  repos: z.record(z.string(), githubRepoSchema),
});

export type ProjectData = z.infer<typeof projectSchema>;
export type ExperienceData = z.infer<typeof experienceSchema>;
export type SkillData = z.infer<typeof skillSchema>;
export type MilestoneData = z.infer<typeof milestoneSchema>;
export type TrackData = z.infer<typeof trackSchema>;
export type SiteData = z.infer<typeof siteSchema>;
export type GitHubRepo = z.infer<typeof githubRepoSchema>;
export type GitHubSnapshot = z.infer<typeof githubSnapshotSchema>;
````

`src/lib/dates.ts`

````ts
// Dates are "YYYY-MM" strings. Never build a Date here: new Date('2026-03') is
// UTC and can display as the previous month.
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function isPlaceholderDate(date: string): boolean {
  return date.startsWith('TODO(owner)');
}

export function compareDates(a: string, b: string): number {
  const left = isPlaceholderDate(a) ? '' : a;
  const right = isPlaceholderDate(b) ? '' : b;
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

export function formatDate(date: string): string {
  if (isPlaceholderDate(date)) return 'Date TBD';
  return `${MONTHS[Number(date.slice(5, 7)) - 1]} ${date.slice(0, 4)}`;
}

export function formatPeriod(period: { start: string; end?: string }): string {
  return `${formatDate(period.start)} – ${period.end ? formatDate(period.end) : 'Present'}`;
}
````

- [ ] **Step 5: Turn on the coverage threshold (gate G4)**

`vitest.config.ts`

````ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/lib/**/*.ts'],
      thresholds: { lines: 90, branches: 90 },
    },
  },
});
````

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
````

- [ ] **Step 6: Run every gate**

````bash
npm run check
npm run test:unit
````

Expected: every command exits 0, with 0 type errors and no failing or skipped test. If one fails, fix your own work. Never change a test, threshold or gate to make it pass.

- [ ] **Step 7: Commit, push and open the PR**

````bash
git add .github src tests vitest.config.ts
git status --short
git commit -m "feat: add content schemas and date helpers"
git push -u origin task/02-schemas-dates
gh pr create --base main --title "feat: add content schemas and date helpers" --body-file - <<'EOF'
## Built

## Gate output

## Defaults relied on

## Open questions

EOF
````

Fill in every section of the PR body first. If `gh` is unavailable, report the compare URL.

- [ ] **Step 8: Stop**

Do not merge and do not start the next task. The owner runs the Opus review and merges.
