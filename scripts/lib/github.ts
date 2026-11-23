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
