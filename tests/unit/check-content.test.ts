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
