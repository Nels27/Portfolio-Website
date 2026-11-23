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
