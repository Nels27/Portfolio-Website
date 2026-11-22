# Task 04: Ranking and evidence

> **For agentic workers:** REQUIRED SUB-SKILL: use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax. Read [00-overview.md](00-overview.md) and the Known traps and Guardrails in [CONTEXT.md](../../../../CONTEXT.md) first. Do only this task.

**Goal:** Deterministic ordering for projects, roles and skills.

**Branch:** `task/04-rank-evidence`

**Files:**
- `tests/unit/rank.test.ts`
- `tests/unit/evidence.test.ts`
- `src/lib/rank.ts`
- `src/lib/evidence.ts`

**Interfaces:**
- Consumes: Types from Task 02. Fixtures from Task 03.
- Produces: From `src/lib/rank.ts`: `rank(projects, trackId)`, `sortExperience(experience)`. From `src/lib/evidence.ts`: `SkillWithEvidence { skill, projects }`, `sortSkills(skills)`, `skillsWithEvidence(skills, projects)`, `skillsForTrack(skills, projects, trackId)`, `skillsForProject(skills, projectId)`.

- [ ] **Step 1: Start the branch**

````bash
git switch main && git pull && git switch -c task/04-rank-evidence
npm ci
````

- [ ] **Step 2: Write the failing tests**

`tests/unit/rank.test.ts`

````ts
import { describe, expect, it } from 'vitest';
import { rank, sortExperience } from '../../src/lib/rank';
import { experience, project } from '../fixtures/content';

const ids = (list: { id: string }[]) => list.map((x) => x.id);

describe('rank', () => {
  it('keeps only non-draft projects in the track', () =>
    expect(ids(rank([project('a'), project('b', { draft: true }), project('c', { tracks: ['beta'] })], 'alpha'))).toEqual(['a']));
  it('orders by featured, ongoing, end, start, then id', () => {
    const list = [
      project('z-tie', { period: { start: '2020-01', end: '2021-01' } }),
      project('a-tie', { period: { start: '2020-01', end: '2021-01' } }),
      project('later-start', { period: { start: '2020-06', end: '2021-01' } }),
      project('later-end', { period: { start: '2019-01', end: '2022-01' } }),
      project('ongoing-tbd', { period: { start: 'TODO(owner): start' } }),
      project('ongoing', { period: { start: '2018-01' } }),
      project('featured', { featured: true, period: { start: '2010-01', end: '2011-01' } }),
    ];
    expect(ids(rank(list, 'alpha'))).toEqual(['featured', 'ongoing', 'ongoing-tbd', 'later-end', 'later-start', 'a-tie', 'z-tie']);
  });
  it('does not change its input', () => {
    const list = [project('b'), project('a')];
    rank(list, 'alpha');
    expect(ids(list)).toEqual(['b', 'a']);
  });
});

describe('sortExperience', () => {
  it('puts current roles first, then newest start, then id', () => {
    const list = [
      experience('old', { start: '2015-01', end: '2016-01' }),
      experience('recent', { start: '2022-01', end: '2026-01' }),
      experience('b-current', { start: '2026-01' }),
      experience('a-current', { start: '2026-01' }),
    ];
    expect(ids(sortExperience(list))).toEqual(['a-current', 'b-current', 'recent', 'old']);
  });
});
````

`tests/unit/evidence.test.ts`

````ts
import { describe, expect, it } from 'vitest';
import { skillsForProject, skillsForTrack, skillsWithEvidence } from '../../src/lib/evidence';
import { project, skill } from '../fixtures/content';

const projects = [project('one'), project('two', { tracks: ['beta'] }), project('draft', { draft: true })];
const skills = [
  skill('lead', { name: 'Leading', category: 'leadership', evidence: ['one'] }),
  skill('zeta', { name: 'Zeta', evidence: ['one', 'two'] }),
  skill('acme', { name: 'Acme', evidence: ['one'] }),
  skill('beta-only', { name: 'Beta', evidence: ['two'] }),
  skill('unproven', { name: 'Unproven', evidence: ['draft'] }),
];
const summary = (list: ReturnType<typeof skillsForTrack>) => list.map((s) => [s.skill.id, s.projects.map((p) => p.id)]);

describe('evidence', () => {
  it('lists a track’s skills by category then name, with only that track’s evidence', () =>
    expect(summary(skillsForTrack(skills, projects, 'alpha'))).toEqual([['acme', ['one']], ['zeta', ['one']], ['lead', ['one']]]));
  it('excludes skills whose only evidence is a draft', () =>
    expect(summary(skillsWithEvidence(skills, projects)).map(([id]) => id)).toEqual(['acme', 'beta-only', 'zeta', 'lead']));
  it('lists the skills a project evidences', () =>
    expect(skillsForProject(skills, 'two').map((s) => s.id)).toEqual(['beta-only', 'zeta']));
});
````

- [ ] **Step 3: Run the tests and confirm they fail**

````bash
npx vitest run tests/unit/rank.test.ts tests/unit/evidence.test.ts
````

Expected: failures, because the code does not exist yet.

- [ ] **Step 4: Implement**

`src/lib/rank.ts`

````ts
import { compareDates } from './dates';
import type { Entry, ExperienceData, ProjectData } from './schemas';

const byId = (a: { id: string }, b: { id: string }) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

export function rank(projects: Entry<ProjectData>[], trackId: string): Entry<ProjectData>[] {
  return projects
    .filter((p) => !p.data.draft && p.data.tracks.includes(trackId))
    .sort((a, b) => {
      const [x, y] = [a.data, b.data];
      return (
        Number(y.featured) - Number(x.featured) ||
        Number(!y.period.end) - Number(!x.period.end) ||
        compareDates(y.period.end ?? '', x.period.end ?? '') ||
        compareDates(y.period.start, x.period.start) ||
        byId(a, b)
      );
    });
}

export function sortExperience(experience: Entry<ExperienceData>[]): Entry<ExperienceData>[] {
  return [...experience].sort(
    (a, b) =>
      Number(!b.data.end) - Number(!a.data.end) ||
      compareDates(b.data.start, a.data.start) ||
      byId(a, b),
  );
}
````

`src/lib/evidence.ts`

````ts
import { SKILL_CATEGORIES, type Entry, type ProjectData, type SkillData } from './schemas';

export interface SkillWithEvidence {
  skill: Entry<SkillData>;
  projects: Entry<ProjectData>[];
}

export function sortSkills(skills: Entry<SkillData>[]): Entry<SkillData>[] {
  return [...skills].sort(
    (a, b) =>
      SKILL_CATEGORIES.indexOf(a.data.category) - SKILL_CATEGORIES.indexOf(b.data.category) ||
      a.data.name.localeCompare(b.data.name, 'en'),
  );
}

export function skillsWithEvidence(
  skills: Entry<SkillData>[],
  projects: Entry<ProjectData>[],
): SkillWithEvidence[] {
  return sortSkills(skills)
    .map((skill) => ({
      skill,
      projects: projects.filter((p) => !p.data.draft && skill.data.evidence.includes(p.id)),
    }))
    .filter((s) => s.projects.length > 0);
}

export function skillsForTrack(
  skills: Entry<SkillData>[],
  projects: Entry<ProjectData>[],
  trackId: string,
): SkillWithEvidence[] {
  return skillsWithEvidence(
    skills,
    projects.filter((p) => p.data.tracks.includes(trackId)),
  );
}

export function skillsForProject(skills: Entry<SkillData>[], projectId: string): Entry<SkillData>[] {
  return sortSkills(skills.filter((s) => s.data.evidence.includes(projectId)));
}
````

- [ ] **Step 5: Run every gate**

````bash
npm run check
npm run test:unit
````

Expected: every command exits 0, with 0 type errors and no failing or skipped test. If one fails, fix your own work. Never change a test, threshold or gate to make it pass.

- [ ] **Step 6: Commit, push and open the PR**

````bash
git add src tests
git status --short
git commit -m "feat: add ranking and skill evidence"
git push -u origin task/04-rank-evidence
gh pr create --base main --title "feat: add ranking and skill evidence" --body-file - <<'EOF'
## Built

## Gate output

## Defaults relied on

## Open questions

EOF
````

Fill in every section of the PR body first. If `gh` is unavailable, report the compare URL.

- [ ] **Step 7: Stop**

Do not merge and do not start the next task. The owner runs the Opus review and merges.
