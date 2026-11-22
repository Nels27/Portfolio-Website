# Task 03: Integrity rules and check-content

> **For agentic workers:** REQUIRED SUB-SKILL: use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax. Read [00-overview.md](00-overview.md) and the Known traps and Guardrails in [CONTEXT.md](../../../../CONTEXT.md) first. Do only this task.

**Goal:** Rules 1–12 as pure functions, and a script that fails when content breaks one.

**Branch:** `task/03-integrity`

**Files:**
- `tests/fixtures/content.ts`
- `tests/unit/integrity.test.ts`
- `tests/unit/check-content.test.ts`
- `src/lib/integrity.ts`
- `scripts/lib/content.ts`
- `scripts/check-content.ts`
- `package.json` (scripts)

**Interfaces:**
- Consumes: Schemas and types from Task 02.
- Produces: From `src/lib/integrity.ts`: `checkContent(c)`, `checkFiles(images, allPaths)`, `checkStrict(files)`, `ContentSet`, `ImageFile`, `RawFile`, `Violation`. From `scripts/lib/content.ts`: `loadContent(root)`, `listFiles(root, dir)`. From `tests/fixtures/content.ts`: `project`, `experience`, `skill`, `track`, `validContent`.

**Notes:**
- Rule 0 means a file does not parse or does not match its schema.
- `npm run check:content` fails until Task 05 adds content. That is expected here.
- The gate does not include `build` yet, so there is no content check in CI until Task 05.

- [ ] **Step 1: Start the branch**

````bash
git switch main && git pull && git switch -c task/03-integrity
npm ci
````

- [ ] **Step 2: Write the fixtures and failing tests**

`tests/fixtures/content.ts`

````ts
import type { ContentSet } from '../../src/lib/integrity';
import type { Entry, ExperienceData, ProjectData, SkillData, TrackData } from '../../src/lib/schemas';

export const project = (id: string, data: Partial<ProjectData> = {}): Entry<ProjectData> => ({
  id,
  data: {
    title: id, summary: 'Summary', tracks: ['alpha'], role: 'Lead', period: { start: '2025-01' },
    stack: ['TypeScript'], outcomes: ['Outcome'], featured: false, confidential: false, draft: false,
    gallery: [], ...data,
  },
});
export const experience = (id: string, data: Partial<ExperienceData> = {}): Entry<ExperienceData> => ({
  id,
  data: {
    organization: 'Org', title: 'Engineer', tracks: ['alpha'], start: '2024-01', highlights: ['Did it'],
    projects: ['one'], ...data,
  },
});
export const skill = (id: string, data: Partial<SkillData> = {}): Entry<SkillData> => ({
  id,
  data: { id, name: id, category: 'testing', evidence: ['one'], ...data },
});
export const track = (id: string, data: Partial<TrackData> = {}): Entry<TrackData> => ({
  id,
  data: { id, title: id, headline: 'Headline', description: 'Text', order: 1, default: false, ...data },
});

/** A content set that passes every rule. */
export const validContent = (): ContentSet => ({
  projects: [project('one')],
  experience: [experience('role')],
  skills: [skill('tests')],
  milestones: [{ id: 'degree', data: { id: 'degree', date: '2019-05', title: 'Degree', kind: 'education' } }],
  tracks: [track('alpha', { default: true })],
});
````

`tests/unit/integrity.test.ts`

````ts
import { describe, expect, it } from 'vitest';
import { MAX_IMAGE_BYTES, checkContent, checkFiles, checkStrict, type ContentSet } from '../../src/lib/integrity';
import { experience, project, skill, track, validContent } from '../fixtures/content';

const rules = (c: ContentSet) => checkContent(c).map((v) => v.rule);
const asset = '../../assets/projects/one/';

describe('checkContent', () => {
  it('accepts valid content', () => expect(checkContent(validContent())).toEqual([]));
  it('accepts a full valid project', () => {
    const c = validContent();
    c.projects = [project('one', { repo: 'Owner/One', demo: 'https://example.com', cover: `${asset}a.png`, coverAlt: 'Alt',
      gallery: [{ src: `${asset}b.png`, alt: 'Alt' }] })];
    expect(checkContent(c)).toEqual([]);
  });

  const invalid: [string, number, (c: ContentSet) => void][] = [
    ['unknown track in a project', 1, (c) => c.projects.push(project('two', { tracks: ['alpha', 'ghost'] }))],
    ['unknown track in a role', 1, (c) => c.experience.push(experience('x', { tracks: ['ghost'] }))],
    ['unknown project in a role', 1, (c) => c.experience.push(experience('x', { projects: ['ghost'] }))],
    ['unknown evidence', 1, (c) => c.skills.push(skill('x', { evidence: ['ghost'] }))],
    ['no default track', 2, (c) => { c.tracks = [track('alpha')]; }],
    ['two default tracks', 2, (c) => { c.tracks.push(track('beta', { default: true })); c.projects.push(project('two', { tracks: ['beta'] })); }],
    ['an empty track', 3, (c) => c.tracks.push(track('beta'))],
    ['a track with only drafts', 3, (c) => { c.tracks.push(track('beta')); c.projects.push(project('two', { tracks: ['beta'], draft: true })); }],
    ['an id that differs from the repo name', 4, (c) => c.projects.push(project('two', { repo: 'Owner/Other' }))],
    ['a confidential repo', 5, (c) => c.projects.push(project('two', { confidential: true, repo: 'Owner/Two' }))],
    ['a confidential demo', 5, (c) => c.projects.push(project('two', { confidential: true, demo: 'https://a.co' }))],
    ['draft evidence', 6, (c) => { c.projects.push(project('two', { draft: true })); c.skills.push(skill('x', { evidence: ['two'] })); }],
    ['a cover without alt', 8, (c) => { c.projects = [project('one', { cover: `${asset}a.png` })]; }],
    ['a blank gallery alt', 8, (c) => { c.projects = [project('one', { gallery: [{ src: `${asset}a.png`, alt: ' ' }] })]; }],
    ['a cover in another folder', 9, (c) => { c.projects = [project('one', { cover: '../../assets/projects/two/a.png', coverAlt: 'A' })]; }],
    ['a gallery path that escapes its folder', 9, (c) => { c.projects = [project('one', { gallery: [{ src: `${asset}../two/a.png`, alt: 'A' }] })]; }],
    ['a role linked to a draft', 12, (c) => { c.projects.push(project('two', { draft: true })); c.experience.push(experience('x', { projects: ['two'] })); }],
  ];
  it.each(invalid)('rejects %s (rule %i)', (_name, rule, mutate) => {
    const c = validContent();
    mutate(c);
    expect(rules(c)).toEqual([rule]);
  });
});

describe('checkFiles', () => {
  const image = { path: 'src/assets/projects/one/a.png', bytes: 10, hasGps: false };
  it('accepts valid images', () =>
    expect(checkFiles([image, { ...image, path: 'public/favicon.svg' }, { ...image, bytes: MAX_IMAGE_BYTES }], ['src/a.ts'])).toEqual([]));
  it('rejects GPS metadata (rule 10)', () => expect(checkFiles([{ ...image, hasGps: true }], [])[0].rule).toBe(10));
  it('rejects oversized images (rule 11)', () => expect(checkFiles([{ ...image, bytes: MAX_IMAGE_BYTES + 1 }], [])[0].rule).toBe(11));
  it('rejects other formats (rule 11)', () => expect(checkFiles([{ ...image, path: 'public/a.webp' }], [])[0].rule).toBe(11));
  it.each(['mp4', 'mov', 'webm', 'mkv'])('rejects .%s (rule 11)', (ext) => expect(checkFiles([], [`public/a.${ext}`])[0].rule).toBe(11));
});

describe('checkStrict', () => {
  it('accepts finished content', () => expect(checkStrict([{ path: 'a', text: 'Done' }])).toEqual([]));
  it('rejects placeholders (rule 7)', () =>
    expect(checkStrict([{ path: 'a', text: 'x: "TODO(owner): y"' }])).toEqual([{ rule: 7, file: 'a', message: 'Contains TODO(owner)' }]));
});
````

`tests/unit/check-content.test.ts`

````ts
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import sharp from 'sharp';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

let root: string;
const write = async (path: string, data: string | Buffer) => {
  await mkdir(dirname(join(root, path)), { recursive: true });
  await writeFile(join(root, path), data);
};
const run = (env: Record<string, string> = {}) => {
  const r = spawnSync('npx', ['tsx', 'scripts/check-content.ts', '--root', root], {
    encoding: 'utf8', env: { ...process.env, STRICT_CONTENT: '', ...env },
  });
  return { status: r.status, stderr: r.stderr };
};
const jpeg = (gps: boolean) => {
  const image = sharp({ create: { width: 8, height: 8, channels: 3, background: '#888' } }).jpeg();
  return (gps ? image.withExif({ IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '33/1 45/1 0/1', GPSLongitudeRef: 'W', GPSLongitude: '84/1 23/1 0/1' } }) : image).toBuffer();
};
const PROJECT = `---
title: One
summary: "TODO(owner): summary"
tracks: [alpha]
role: Lead
period: { start: "2025-01" }
stack: [TypeScript]
outcomes: [Outcome]
---
Body
`;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'content-'));
  await write('src/content/projects/one.mdx', PROJECT);
  await write('src/content/experience/role.yaml', 'organization: O\ntitle: T\ntracks: [alpha]\nstart: "2024-01"\nhighlights: [H]\n');
  await write('src/content/skills.yaml', '- { id: s, name: S, category: testing, evidence: [one] }\n');
  await write('src/content/milestones.yaml', '- { id: m, date: "2019-05", title: M, kind: education }\n');
  await write('src/content/tracks.yaml', '- { id: alpha, title: A, headline: H, description: D, order: 1, default: true }\n');
  await write('src/content/site.yaml', 'name: N\nheadline: H\nemail: a@b.co\ngithub: https://github.com/n\nlinkedin: https://linkedin.com/in/n\n');
  await write('src/assets/projects/one/ok.jpg', await jpeg(false));
});
afterEach(() => rm(root, { recursive: true, force: true }));

describe('check-content', { timeout: 30_000 }, () => {
  it('passes on valid content', () => expect(run()).toMatchObject({ status: 0 }));
  it('fails on a broken reference', async () => {
    await write('src/content/skills.yaml', '- { id: s, name: S, category: testing, evidence: [ghost] }\n');
    expect(run()).toMatchObject({ status: 1, stderr: expect.stringContaining('[rule 1]') });
  });
  it('fails on unquoted placeholders', async () => {
    await write('src/content/projects/one.mdx', PROJECT.replace('"TODO(owner): summary"', 'TODO(owner): summary'));
    expect(run()).toMatchObject({ status: 1, stderr: expect.stringContaining('[rule 0] src/content/projects/one.mdx') });
  });
  it('fails on a schema error', async () => {
    await write('src/content/site.yaml', 'name: N\n');
    expect(run()).toMatchObject({ status: 1, stderr: expect.stringContaining('[rule 0] src/content/site.yaml') });
  });
  it('fails on a duplicate id', async () => {
    const row = '- { id: m, date: "2019-05", title: M, kind: education }\n';
    await write('src/content/milestones.yaml', row + row);
    expect(run()).toMatchObject({ status: 1, stderr: expect.stringContaining('Duplicate id') });
  });
  it('fails on missing frontmatter', async () => {
    await write('src/content/projects/one.mdx', 'Body only');
    expect(run()).toMatchObject({ status: 1, stderr: expect.stringContaining('Missing frontmatter') });
  });
  it('fails on GPS metadata', async () => {
    await write('public/photo.jpg', await jpeg(true));
    expect(run()).toMatchObject({ status: 1, stderr: expect.stringContaining('[rule 10] public/photo.jpg') });
  });
  it('fails on an oversized image', async () => {
    const ok = await readFile(join(root, 'src/assets/projects/one/ok.jpg'));
    await write('src/assets/projects/one/big.jpg', Buffer.concat([ok, Buffer.alloc(5 * 1024 * 1024)]));
    expect(run()).toMatchObject({ status: 1, stderr: expect.stringContaining('larger than 5 MB') });
  });
  it('fails on a video', async () => {
    await write('public/demo.mp4', '');
    expect(run()).toMatchObject({ status: 1, stderr: expect.stringContaining('Video files') });
  });
  it('fails on placeholders only in strict mode', () =>
    expect(run({ STRICT_CONTENT: 'true' })).toMatchObject({ status: 1, stderr: expect.stringContaining('[rule 7]') }));
});
````

- [ ] **Step 3: Run the tests and confirm they fail**

````bash
npx vitest run tests/unit/integrity.test.ts tests/unit/check-content.test.ts
````

Expected: failures, because the code does not exist yet.

- [ ] **Step 4: Implement the rules**

`src/lib/integrity.ts`

````ts
import type { Entry, ExperienceData, MilestoneData, ProjectData, SkillData, TrackData } from './schemas';

export const MIN_PROJECTS_PER_TRACK = 1;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export interface ContentSet {
  projects: Entry<ProjectData>[];
  experience: Entry<ExperienceData>[];
  skills: Entry<SkillData>[];
  milestones: Entry<MilestoneData>[];
  tracks: Entry<TrackData>[];
}
export interface ImageFile {
  path: string;
  bytes: number;
  hasGps: boolean;
}
export interface RawFile {
  path: string;
  text: string;
}
export interface Violation {
  rule: number;
  file: string;
  message: string;
}

const projectFile = (id: string) => `src/content/projects/${id}.mdx`;
const experienceFile = (id: string) => `src/content/experience/${id}.yaml`;
const SKILLS = 'src/content/skills.yaml';
const TRACKS = 'src/content/tracks.yaml';

export function checkContent(c: ContentSet): Violation[] {
  const out: Violation[] = [];
  const add = (rule: number, file: string, message: string) => out.push({ rule, file, message });
  const projectIds = new Set(c.projects.map((p) => p.id));
  const trackIds = new Set(c.tracks.map((t) => t.id));
  const drafts = new Set(c.projects.filter((p) => p.data.draft).map((p) => p.id));

  const need = (ids: Set<string>, refs: string[], file: string) => {
    for (const ref of refs) if (!ids.has(ref)) add(1, file, `Unknown reference "${ref}"`);
  };

  for (const { id, data } of c.projects) {
    const file = projectFile(id);
    need(trackIds, data.tracks, file);
    if (data.repo && data.repo.split('/')[1].toLowerCase() !== id)
      add(4, file, `Filename must equal the repository name in "${data.repo}", lowercased`);
    if (data.confidential && (data.repo || data.demo))
      add(5, file, 'Confidential projects cannot have a repo or demo');
    if (data.cover && !data.coverAlt?.trim()) add(8, file, 'cover needs a non-empty coverAlt');
    for (const item of data.gallery)
      if (!item.alt.trim()) add(8, file, `Gallery image "${item.src}" needs alt text`);
    const folder = `../../assets/projects/${id}/`;
    for (const src of [data.cover, ...data.gallery.map((g) => g.src)])
      if (src && (!src.startsWith(folder) || src.slice(folder.length).includes('..')))
        add(9, file, `Image "${src}" must be in src/assets/projects/${id}/`);
  }

  for (const { id, data } of c.experience) {
    const file = experienceFile(id);
    need(trackIds, data.tracks, file);
    need(projectIds, data.projects, file);
    for (const ref of data.projects)
      if (drafts.has(ref)) add(12, file, `Links to draft project "${ref}"`);
  }

  for (const { id, data } of c.skills) {
    need(projectIds, data.evidence, SKILLS);
    for (const ref of data.evidence)
      if (drafts.has(ref)) add(6, SKILLS, `Skill "${id}" uses draft project "${ref}" as evidence`);
  }

  const defaults = c.tracks.filter((t) => t.data.default).length;
  if (defaults !== 1) add(2, TRACKS, `Expected exactly 1 default track, found ${defaults}`);
  for (const { id } of c.tracks) {
    const count = c.projects.filter((p) => !p.data.draft && p.data.tracks.includes(id)).length;
    if (count < MIN_PROJECTS_PER_TRACK)
      add(3, TRACKS, `Track "${id}" has ${count} projects, needs ${MIN_PROJECTS_PER_TRACK}`);
  }
  return out;
}

export function checkFiles(images: ImageFile[], allPaths: string[]): Violation[] {
  const out: Violation[] = [];
  for (const { path, bytes, hasGps } of images) {
    if (hasGps) out.push({ rule: 10, file: path, message: 'Image contains GPS metadata' });
    if (bytes > MAX_IMAGE_BYTES) out.push({ rule: 11, file: path, message: 'Image is larger than 5 MB' });
    if (!/\.(?:png|jpe?g|svg)$/i.test(path))
      out.push({ rule: 11, file: path, message: 'Images must be .png, .jpg, .jpeg or .svg' });
  }
  for (const path of allPaths)
    if (/\.(?:mp4|mov|webm|mkv)$/i.test(path))
      out.push({ rule: 11, file: path, message: 'Video files are not allowed' });
  return out;
}

export function checkStrict(files: RawFile[]): Violation[] {
  return files
    .filter((f) => f.text.includes('TODO(owner)'))
    .map((f) => ({ rule: 7, file: f.path, message: 'Contains TODO(owner)' }));
}
````

- [ ] **Step 5: Implement the loader and script**

`scripts/lib/content.ts`

````ts
import { readFile, readdir } from 'node:fs/promises';
import { basename, join, relative, sep } from 'node:path';
import { parse } from 'yaml';
import type { ContentSet, RawFile, Violation } from '../../src/lib/integrity';
import {
  experienceSchema,
  milestoneSchema,
  projectSchema,
  siteSchema,
  skillSchema,
  trackSchema,
  type Entry,
} from '../../src/lib/schemas';

interface Schema<T> {
  safeParse(value: unknown): { success: true; data: T } | { success: false; error: { message: string } };
}

/** Every file under dir, as repo-relative paths with forward slashes. Missing folders are empty. */
export async function listFiles(root: string, dir: string): Promise<string[]> {
  const entries = await readdir(join(root, dir), { recursive: true, withFileTypes: true }).catch(() => []);
  return entries
    .filter((e) => e.isFile())
    .map((e) => relative(root, join(e.parentPath, e.name)).split(sep).join('/'))
    .sort();
}

function frontmatter(text: string): unknown {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  if (!match) throw new Error('Missing frontmatter');
  return parse(match[1]);
}

export interface LoadedContent {
  content: ContentSet;
  files: RawFile[];
  /** Files that don't parse or don't match their schema, reported as rule 0. */
  errors: Violation[];
}

export async function loadContent(root: string): Promise<LoadedContent> {
  const errors: Violation[] = [];
  const files: RawFile[] = [];
  for (const path of await listFiles(root, 'src/content'))
    files.push({ path, text: await readFile(join(root, path), 'utf8') });

  const fail = (file: string, error: unknown) =>
    errors.push({ rule: 0, file, message: error instanceof Error ? error.message : String(error) });

  function check<T>(schema: Schema<T>, id: string, value: unknown, file: string): Entry<T>[] {
    const result = schema.safeParse(value);
    if (result.success) return [{ id, data: result.data }];
    fail(file, result.error.message);
    return [];
  }

  function folder<T>(dir: string, ext: string, schema: Schema<T>, read: (t: string) => unknown): Entry<T>[] {
    return files
      .filter((f) => f.path.startsWith(`src/content/${dir}/`) && f.path.endsWith(ext))
      .flatMap((f) => {
        try {
          return check(schema, basename(f.path, ext).toLowerCase(), read(f.text), f.path);
        } catch (error) {
          fail(f.path, error);
          return [];
        }
      });
  }

  function list<T>(name: string, schema: Schema<T>): Entry<T>[] {
    const path = `src/content/${name}.yaml`;
    const file = files.find((f) => f.path === path);
    try {
      const rows: unknown = parse(file?.text ?? '');
      if (!Array.isArray(rows)) throw new Error('Expected a list');
      const seen = new Set<string>();
      return rows.flatMap((row) => {
        const id = String(row?.id);
        if (seen.has(id)) fail(path, new Error(`Duplicate id "${id}"`));
        seen.add(id);
        return check(schema, id, row, path);
      });
    } catch (error) {
      fail(path, error);
      return [];
    }
  }

  const content: ContentSet = {
    projects: folder('projects', '.mdx', projectSchema, frontmatter),
    experience: folder('experience', '.yaml', experienceSchema, (t) => parse(t)),
    skills: list('skills', skillSchema),
    milestones: list('milestones', milestoneSchema),
    tracks: list('tracks', trackSchema),
  };

  const site = files.find((f) => f.path === 'src/content/site.yaml');
  try {
    check(siteSchema, 'site', parse(site?.text ?? ''), 'src/content/site.yaml');
  } catch (error) {
    fail('src/content/site.yaml', error);
  }
  return { content, files, errors };
}
````

`scripts/check-content.ts`

````ts
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import exifr from 'exifr';
import { checkContent, checkFiles, checkStrict, type ImageFile } from '../src/lib/integrity';
import { listFiles, loadContent } from './lib/content';

const IMAGE = /\.(?:png|jpe?g|svg|webp|avif|gif|heic|tiff?)$/i;
const GPS_READABLE = /\.(?:png|jpe?g)$/i;

const { values } = parseArgs({ options: { root: { type: 'string', default: '.' } } });
const root = resolve(values.root);

const { content, files, errors } = await loadContent(root);
const paths = [...(await listFiles(root, 'src')), ...(await listFiles(root, 'public'))];

const images: ImageFile[] = [];
for (const path of paths) {
  if (!IMAGE.test(path) || !(path.startsWith('src/assets/') || path.startsWith('public/'))) continue;
  const buffer = await readFile(join(root, path));
  let hasGps = false;
  if (GPS_READABLE.test(path)) {
    try {
      hasGps = Boolean(await exifr.gps(buffer));
    } catch (error) {
      errors.push({ rule: 10, file: path, message: `Cannot read image metadata: ${String(error)}` });
    }
  }
  images.push({ path, bytes: buffer.length, hasGps });
}

const violations = [
  ...errors,
  ...checkContent(content),
  ...checkFiles(images, paths),
  ...(process.env.STRICT_CONTENT === 'true' ? checkStrict(files) : []),
];

for (const v of violations) console.error(`[rule ${v.rule}] ${v.file}: ${v.message}`);
if (violations.length > 0) process.exit(1);
console.log(`Content OK: ${files.length} files, ${images.length} images`);
````

````bash
npm pkg set scripts.check:content="tsx scripts/check-content.ts"
````

- [ ] **Step 6: Run every gate**

````bash
npm run check
npm run test:unit
````

Expected: every command exits 0, with 0 type errors and no failing or skipped test. If one fails, fix your own work. Never change a test, threshold or gate to make it pass.

- [ ] **Step 7: Commit, push and open the PR**

````bash
git add package-lock.json package.json scripts src tests
git status --short
git commit -m "feat: add content integrity rules"
git push -u origin task/03-integrity
gh pr create --base main --title "feat: add content integrity rules" --body-file - <<'EOF'
## Built

## Gate output

## Defaults relied on

## Open questions

EOF
````

Fill in every section of the PR body first. If `gh` is unavailable, report the compare URL.

- [ ] **Step 8: Stop**

Do not merge and do not start the next task. The owner runs the Opus review and merges.
