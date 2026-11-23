import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GitHubDataError, buildQuery, fetchGitHub, type FetchOptions } from '../../scripts/lib/github';

let dir: string;
let warn: ReturnType<typeof vi.fn<(message: string) => void>>;
const raw = {
  nameWithOwner: 'o/b', isPrivate: false, description: null, url: 'https://github.com/o/b', homepageUrl: '',
  stargazerCount: 2, pushedAt: null, isArchived: false, primaryLanguage: { name: 'TypeScript' },
  languages: { nodes: [{ name: 'TypeScript' }, { name: 'CSS' }] },
  defaultBranchRef: { target: { committedDate: '2026-02-02T00:00:00Z', statusCheckRollup: { state: 'SUCCESS' } } },
};
const json = (body: unknown, init: ResponseInit = {}) => async () => new Response(JSON.stringify(body), init);
const run = (fetch: () => Promise<Response>, change: Partial<FetchOptions> = {}) =>
  fetchGitHub({
    repos: ['o/b'], token: 'token', outPath: join(dir, 'out/github.json'), fixturePath: 'tests/fixtures/github.json',
    fetch: fetch as typeof globalThis.fetch, now: () => new Date('2026-03-03T00:00:00Z'), warn, ...change,
  });
const written = async () => JSON.parse(await readFile(join(dir, 'out/github.json'), 'utf8'));

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'github-'));
  warn = vi.fn<(message: string) => void>();
});
afterEach(() => rm(dir, { recursive: true, force: true }));

describe('live data', () => {
  it('writes a simplified snapshot', async () => {
    await run(json({ data: { r0: raw } }));
    expect(await written()).toEqual({
      fetchedAt: '2026-03-03T00:00:00.000Z', source: 'live',
      repos: { 'o/b': { nameWithOwner: 'o/b', description: null, url: 'https://github.com/o/b', homepageUrl: null,
        primaryLanguage: 'TypeScript', languages: ['TypeScript', 'CSS'], stargazerCount: 2, pushedAt: null,
        isArchived: false, lastCommit: '2026-02-02T00:00:00Z', status: 'SUCCESS' } },
    });
    expect(warn).not.toHaveBeenCalled();
  });
  it('handles an empty repository', async () => {
    const r = await run(json({ data: { r0: { ...raw, primaryLanguage: null, languages: null, defaultBranchRef: null } } }));
    expect(r.repos['o/b']).toMatchObject({ primaryLanguage: null, languages: [], lastCommit: null, status: 'none' });
  });
  it('sorts repositories', async () => {
    await run(json({ data: { r0: raw, r1: raw } }), { repos: ['o/z', 'o/a'] });
    expect(Object.keys((await written()).repos)).toEqual(['o/a', 'o/z']);
  });
  it('skips the request when there are no repositories', async () => {
    const fetch = vi.fn(json({}));
    expect(await run(fetch, { repos: [] })).toMatchObject({ source: 'live', repos: {} });
    expect(fetch).not.toHaveBeenCalled();
  });
  it('uses one alias per repository', () => {
    const query = buildQuery(['o/a', 'o/b']);
    expect(query).toContain('r0: repository(owner: "o", name: "a")');
    expect(query).toContain('r1: repository(owner: "o", name: "b")');
  });
  it('treats a forbidden check status as none', async () => {
    const r = await run(json({
      data: { r0: { ...raw, defaultBranchRef: { target: { committedDate: 'x', statusCheckRollup: null } } } },
      errors: [{ type: 'FORBIDDEN', message: 'Resource not accessible', path: ['r0', 'defaultBranchRef', 'target', 'statusCheckRollup'] }],
    }));
    expect(r).toMatchObject({ source: 'live', repos: { 'o/b': { status: 'none' } } });
    expect(warn).toHaveBeenCalledOnce();
  });
});

describe('missing data is tolerated', () => {
  const unavailable: [string, () => Promise<Response>][] = [
    ['a network error', async () => { throw new TypeError('fetch failed'); }],
    ['HTTP 502', json({}, { status: 502 })],
    ['HTTP 429', json({}, { status: 429 })],
    ['HTTP 403 with no quota left', json({}, { status: 403, headers: { 'x-ratelimit-remaining': '0' } })],
    ['HTTP 403 with retry-after', json({}, { status: 403, headers: { 'retry-after': '60' } })],
    ['HTTP 403 with a rate limit message', json({ message: 'You have exceeded a secondary rate limit' }, { status: 403 })],
    ['RATE_LIMITED', json({ errors: [{ type: 'RATE_LIMITED', message: 'slow down' }] })],
  ];
  it.each(unavailable)('uses the fixture on %s', async (_name, fetch) => {
    expect((await run(fetch)).source).toBe('fixture');
    expect(warn).toHaveBeenCalledOnce();
  });
  it.each(unavailable)('keeps cached data on %s', async (_name, fetch) => {
    const first = await run(json({ data: { r0: raw } }));
    const second = await run(fetch, { now: () => new Date('2027-01-01') });
    expect(second).toEqual({ ...first, source: 'cache' });
  });
  it('uses the fixture when the cache is corrupt', async () => {
    const outPath = join(dir, 'github.json');
    await writeFile(outPath, '{');
    expect((await run(unavailable[0][1], { outPath })).source).toBe('fixture');
  });
  it('uses the fixture without a token and sends no request', async () => {
    const fetch = vi.fn(json({}));
    expect((await run(fetch, { token: undefined })).source).toBe('fixture');
    expect(fetch).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledOnce();
  });
});

describe('wrong data fails', () => {
  it.each([
    ['HTTP 401', json({ message: 'Bad credentials' }, { status: 401 })],
    ['HTTP 403 that is not a rate limit', json({ message: 'Forbidden' }, { status: 403 })],
    ['NOT_FOUND', json({ data: { r0: null }, errors: [{ type: 'NOT_FOUND', message: 'nope', path: ['r0'] }] })],
    ['a private repository', json({ data: { r0: { ...raw, isPrivate: true } } })],
    ['FORBIDDEN on a whole repository', json({ data: { r0: null }, errors: [{ type: 'FORBIDDEN', message: 'no', path: ['r0'] }] })],
    ['an unknown GraphQL error', json({ errors: [{ message: 'syntax' }] })],
    ['missing repository data', json({ data: {} })],
  ])('on %s', async (_name, fetch) => {
    await expect(run(fetch)).rejects.toBeInstanceOf(GitHubDataError);
  });
  it('does not overwrite existing data', async () => {
    const first = await run(json({ data: { r0: raw } }));
    await expect(run(json({}, { status: 401 }))).rejects.toThrow();
    expect(await written()).toEqual(first);
  });
  it('fails on an invalid fixture', async () => {
    const fixturePath = join(dir, 'bad.json');
    await writeFile(fixturePath, '{}');
    await expect(run(json({}), { token: undefined, fixturePath })).rejects.toThrow('Invalid fixture');
  });
});
