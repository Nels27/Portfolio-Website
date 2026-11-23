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
