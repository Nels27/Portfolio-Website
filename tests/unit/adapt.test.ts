import { describe, expect, it } from 'vitest';
import { adaptExperience, adaptProject, adaptSkill } from '../../src/lib/adapt';

const ref = (collection: string, id: string) => ({ collection, id });

describe('adapt', () => {
  it('flattens project references and drops images', () =>
    expect(adaptProject({ id: 'p', data: { title: 'P', tracks: [ref('tracks', 'a')], cover: {}, gallery: [{}] } })).toEqual({
      id: 'p', data: { title: 'P', tracks: ['a'], cover: undefined, gallery: [] },
    }));
  it('flattens experience references', () =>
    expect(adaptExperience({ id: 'e', data: { tracks: [ref('tracks', 'a')], projects: [ref('projects', 'p')] } })).toEqual({
      id: 'e', data: { tracks: ['a'], projects: ['p'] },
    }));
  it('flattens skill references', () =>
    expect(adaptSkill({ id: 's', data: { evidence: [ref('projects', 'p')] } })).toEqual({ id: 's', data: { evidence: ['p'] } }));
});
