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
