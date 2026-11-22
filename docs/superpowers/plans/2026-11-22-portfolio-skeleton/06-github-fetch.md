# Task 06: GitHub data

> **For agentic workers:** REQUIRED SUB-SKILL: use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax. Read [00-overview.md](00-overview.md) and the Known traps and Guardrails in [CONTEXT.md](../../../../CONTEXT.md) first. Do only this task.

**Goal:** A tested fetch that fails on wrong data, tolerates missing data, and feeds an Astro collection.

**Branch:** `task/06-github-fetch`

**Files:**
- `tests/fixtures/github.json`
- `tests/unit/github.test.ts`
- `scripts/lib/github.ts`
- `scripts/fetch-github.ts`
- `src/content.config.ts`
- `package.json` (scripts)

**Interfaces:**
- Consumes: `loadContent(root)` from Task 03. Snapshot schema from Task 02.
- Produces: Collection `github` with one entry, id `snapshot`, shaped as `GitHubSnapshot`. From `scripts/lib/github.ts`: `fetchGitHub(options)`, `buildQuery(repos)`, `GitHubDataError`, `FetchOptions`.

**Notes:**
- Run the gates with `GH_GRAPHQL_TOKEN` unset. The build prints a fixture warning and passes.
- Never commit `src/data/github.json`.

- [ ] **Step 1: Start the branch**

````bash
git switch main && git pull && git switch -c task/06-github-fetch
npm ci
````

- [ ] **Step 2: Write the fixture and failing tests**

`tests/fixtures/github.json`

````json
{
  "fetchedAt": "2026-01-01T00:00:00.000Z",
  "source": "fixture",
  "repos": {
    "Nels27/AgentsOfOlympus": {
      "nameWithOwner": "Nels27/AgentsOfOlympus",
      "description": "Fixture description",
      "url": "https://github.com/Nels27/AgentsOfOlympus",
      "homepageUrl": null,
      "primaryLanguage": "Shell",
      "languages": [
        "Shell",
        "Dockerfile"
      ],
      "stargazerCount": 0,
      "pushedAt": "2026-01-01T00:00:00Z",
      "isArchived": false,
      "lastCommit": "2026-01-01T00:00:00Z",
      "status": "none"
    },
    "Nels27/Portfolio-Website": {
      "nameWithOwner": "Nels27/Portfolio-Website",
      "description": "Fixture description",
      "url": "https://github.com/Nels27/Portfolio-Website",
      "homepageUrl": null,
      "primaryLanguage": null,
      "languages": [],
      "stargazerCount": 0,
      "pushedAt": "2026-01-01T00:00:00Z",
      "isArchived": false,
      "lastCommit": "2026-01-01T00:00:00Z",
      "status": "none"
    }
  }
}
````

`tests/unit/github.test.ts`

````ts
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
````

- [ ] **Step 3: Run the tests and confirm they fail**

````bash
npx vitest run tests/unit/github.test.ts
````

Expected: failures, because the code does not exist yet.

- [ ] **Step 4: Implement the fetch**

`scripts/lib/github.ts`

````ts
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { githubSnapshotSchema, type GitHubRepo, type GitHubSnapshot } from '../../src/lib/schemas';

export interface FetchOptions {
  repos: string[];
  token: string | undefined;
  outPath: string;
  fixturePath: string;
  fetch: typeof globalThis.fetch;
  now: () => Date;
  warn: (message: string) => void;
}

/** Wrong data: the build must fail. */
export class GitHubDataError extends Error {}
/** Missing data: fall back to the cache or the fixture. */
class UnavailableError extends Error {}

const FIELDS = `
  nameWithOwner isPrivate description url homepageUrl stargazerCount pushedAt isArchived
  primaryLanguage { name }
  languages(first: 5, orderBy: { field: SIZE, direction: DESC }) { nodes { name } }
  defaultBranchRef { target { ... on Commit { committedDate statusCheckRollup { state } } } }
`;

interface RawRepo {
  nameWithOwner: string;
  isPrivate: boolean;
  description: string | null;
  url: string;
  homepageUrl: string | null;
  stargazerCount: number;
  pushedAt: string | null;
  isArchived: boolean;
  primaryLanguage: { name: string } | null;
  languages: { nodes: { name: string }[] } | null;
  defaultBranchRef: {
    target: { committedDate?: string; statusCheckRollup?: { state: string } | null } | null;
  } | null;
}
interface GraphQLError {
  type?: string;
  message: string;
  path?: (string | number)[];
}
interface GraphQLResponse {
  data?: Record<string, RawRepo | null> | null;
  errors?: GraphQLError[];
}

export function buildQuery(repos: string[]): string {
  const parts = repos.map((repo, i) => {
    const [owner, name] = repo.split('/');
    return `r${i}: repository(owner: ${JSON.stringify(owner)}, name: ${JSON.stringify(name)}) {${FIELDS}}`;
  });
  return `query {\n${parts.join('\n')}\n}`;
}

function simplify(raw: RawRepo): GitHubRepo {
  const commit = raw.defaultBranchRef?.target;
  return {
    nameWithOwner: raw.nameWithOwner,
    description: raw.description,
    url: raw.url,
    homepageUrl: raw.homepageUrl || null,
    primaryLanguage: raw.primaryLanguage?.name ?? null,
    languages: raw.languages?.nodes.map((n) => n.name) ?? [],
    stargazerCount: raw.stargazerCount,
    pushedAt: raw.pushedAt,
    isArchived: raw.isArchived,
    lastCommit: commit?.committedDate ?? null,
    status: commit?.statusCheckRollup?.state ?? 'none',
  };
}

async function request(o: FetchOptions): Promise<GraphQLResponse> {
  let response: Response;
  try {
    response = await o.fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${o.token}`,
        'content-type': 'application/json',
        'user-agent': 'portfolio-website-build',
      },
      body: JSON.stringify({ query: buildQuery(o.repos) }),
      signal: AbortSignal.timeout(20_000),
    });
  } catch (error) {
    throw new UnavailableError(`Network error: ${String(error)}`);
  }
  if (response.ok) return (await response.json()) as GraphQLResponse;

  const body = await response.text();
  const rateLimited =
    response.status === 429 ||
    (response.status === 403 &&
      (response.headers.get('x-ratelimit-remaining') === '0' ||
        response.headers.has('retry-after') ||
        /rate limit/i.test(body)));
  if (rateLimited || response.status >= 500) throw new UnavailableError(`HTTP ${response.status}`);
  if (response.status === 401) throw new GitHubDataError('GH_GRAPHQL_TOKEN is invalid or expired');
  throw new GitHubDataError(`HTTP ${response.status}`);
}

function parseResponse(response: GraphQLResponse, o: FetchOptions): Record<string, GitHubRepo> {
  for (const error of response.errors ?? []) {
    if (error.type === 'RATE_LIMITED') throw new UnavailableError('Rate limited');
    if (error.type === 'FORBIDDEN' && error.path?.includes('statusCheckRollup')) {
      o.warn(`Cannot read check status: ${error.message}`);
      continue;
    }
    throw new GitHubDataError(`${error.type ?? 'ERROR'}: ${error.message}`);
  }
  const result: Record<string, GitHubRepo> = {};
  o.repos.forEach((repo, i) => {
    const raw = response.data?.[`r${i}`];
    if (!raw) throw new GitHubDataError(`No data for ${repo}`);
    if (raw.isPrivate) throw new GitHubDataError(`${repo} is private, so visitors could not open it`);
    result[repo] = simplify(raw);
  });
  return result;
}

const readSnapshot = async (path: string): Promise<GitHubSnapshot | undefined> => {
  try {
    return githubSnapshotSchema.parse(JSON.parse(await readFile(path, 'utf8')));
  } catch {
    return undefined;
  }
};

async function fixture(o: FetchOptions): Promise<GitHubSnapshot> {
  const snapshot = await readSnapshot(o.fixturePath);
  if (!snapshot) throw new GitHubDataError(`Invalid fixture: ${o.fixturePath}`);
  return { ...snapshot, source: 'fixture' };
}

async function snapshot(o: FetchOptions): Promise<GitHubSnapshot> {
  const live = (repos: GitHubSnapshot['repos']): GitHubSnapshot => ({
    fetchedAt: o.now().toISOString(),
    source: 'live',
    repos,
  });
  if (!o.token) {
    o.warn('GH_GRAPHQL_TOKEN is not set, using fixture data');
    return fixture(o);
  }
  if (o.repos.length === 0) return live({});
  try {
    return live(parseResponse(await request(o), o));
  } catch (error) {
    if (!(error instanceof UnavailableError)) throw error;
    const cached = await readSnapshot(o.outPath);
    o.warn(`GitHub is unavailable (${error.message}), using ${cached ? 'cached' : 'fixture'} data`);
    return cached ? { ...cached, source: 'cache' } : fixture(o);
  }
}

/** Writes the snapshot and returns it. Throws GitHubDataError when the build must fail. */
export async function fetchGitHub(o: FetchOptions): Promise<GitHubSnapshot> {
  const result = await snapshot(o);
  const repos = Object.fromEntries(
    Object.entries(result.repos).sort(([a], [b]) => (a < b ? -1 : 1)),
  );
  const sorted = { fetchedAt: result.fetchedAt, source: result.source, repos };
  await mkdir(dirname(o.outPath), { recursive: true });
  await writeFile(o.outPath, `${JSON.stringify(sorted, null, 2)}\n`);
  return sorted;
}
````

`scripts/fetch-github.ts`

````ts
import { loadContent } from './lib/content';
import { fetchGitHub } from './lib/github';

const { content } = await loadContent('.');
const repos = [
  ...new Set(content.projects.flatMap((p) => (p.data.repo && !p.data.draft ? [p.data.repo] : []))),
].sort();

try {
  const result = await fetchGitHub({
    repos,
    token: process.env.GH_GRAPHQL_TOKEN || undefined,
    outPath: 'src/data/github.json',
    fixturePath: 'tests/fixtures/github.json',
    fetch: globalThis.fetch,
    now: () => new Date(),
    warn: (message) => console.warn(`Warning: ${message}`),
  });
  console.log(`GitHub data: ${result.source}, ${Object.keys(result.repos).length} repositories`);
} catch (error) {
  console.error(`GitHub data error: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
````

- [ ] **Step 5: Add the collection and the import**

In `src/content.config.ts`, replace:

````ts
  experienceSchema,
````

with:

````ts
  experienceSchema,
  githubSnapshotSchema,
````

In `src/content.config.ts`, replace:

````ts
    schema: siteSchema,
  }),
````

with:

````ts
    schema: siteSchema,
  }),
  github: defineCollection({
    loader: file('src/data/github.json', {
      parser: (text) => [{ id: 'snapshot', ...JSON.parse(text) }],
    }),
    schema: githubSnapshotSchema,
  }),
````

- [ ] **Step 6: Add the fetch to the build**

````bash
npm pkg set scripts.fetch:github="tsx scripts/fetch-github.ts" scripts.build="npm run check:content && npm run fetch:github && astro build"
````

- [ ] **Step 7: Run every gate**

````bash
npm run check
npm run test:unit
npm run build
````

Expected: every command exits 0, with 0 type errors and no failing or skipped test. If one fails, fix your own work. Never change a test, threshold or gate to make it pass.

- [ ] **Step 8: Commit, push and open the PR**

````bash
git add package-lock.json package.json scripts src tests
git status --short
git commit -m "feat: fetch GitHub repository data"
git push -u origin task/06-github-fetch
gh pr create --base main --title "feat: fetch GitHub repository data" --body-file - <<'EOF'
## Built

## Gate output

## Defaults relied on

## Open questions

EOF
````

Fill in every section of the PR body first. If `gh` is unavailable, report the compare URL.

- [ ] **Step 9: Stop**

Do not merge and do not start the next task. The owner runs the Opus review and merges.
