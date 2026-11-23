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
