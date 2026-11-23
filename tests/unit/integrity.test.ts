import { describe, expect, it } from 'vitest';
import { MAX_IMAGE_BYTES, checkContent, checkFiles, checkStrict, type ContentSet } from '../../src/lib/integrity';
import { experience, project, skill, track, validContent } from '../fixtures/content';

const rules = (c: ContentSet) => checkContent(c).map((v) => v.rule);
const asset = '../../assets/projects/one/';

describe('checkContent', () => {
  it('accepts valid content', () => expect(checkContent(validContent())).toEqual([]));
  it('accepts a full valid project', () => {
    const c = validContent();
    c.projects = [project('one', { repo: 'Owner/One', demo: 'https://example.com', cover: `${asset}a.png`, coverAlt: 'Alt',
      gallery: [{ src: `${asset}b.png`, alt: 'Alt' }] })];
    expect(checkContent(c)).toEqual([]);
  });

  const invalid: [string, number, (c: ContentSet) => void][] = [
    ['unknown track in a project', 1, (c) => c.projects.push(project('two', { tracks: ['alpha', 'ghost'] }))],
    ['unknown track in a role', 1, (c) => c.experience.push(experience('x', { tracks: ['ghost'] }))],
    ['unknown project in a role', 1, (c) => c.experience.push(experience('x', { projects: ['ghost'] }))],
    ['unknown evidence', 1, (c) => c.skills.push(skill('x', { evidence: ['ghost'] }))],
    ['no default track', 2, (c) => { c.tracks = [track('alpha')]; }],
    ['two default tracks', 2, (c) => { c.tracks.push(track('beta', { default: true })); c.projects.push(project('two', { tracks: ['beta'] })); }],
    ['an empty track', 3, (c) => c.tracks.push(track('beta'))],
    ['a track with only drafts', 3, (c) => { c.tracks.push(track('beta')); c.projects.push(project('two', { tracks: ['beta'], draft: true })); }],
    ['an id that differs from the repo name', 4, (c) => c.projects.push(project('two', { repo: 'Owner/Other' }))],
    ['a confidential repo', 5, (c) => c.projects.push(project('two', { confidential: true, repo: 'Owner/Two' }))],
    ['a confidential demo', 5, (c) => c.projects.push(project('two', { confidential: true, demo: 'https://a.co' }))],
    ['draft evidence', 6, (c) => { c.projects.push(project('two', { draft: true })); c.skills.push(skill('x', { evidence: ['two'] })); }],
    ['a cover without alt', 8, (c) => { c.projects = [project('one', { cover: `${asset}a.png` })]; }],
    ['a blank gallery alt', 8, (c) => { c.projects = [project('one', { gallery: [{ src: `${asset}a.png`, alt: ' ' }] })]; }],
    ['a cover in another folder', 9, (c) => { c.projects = [project('one', { cover: '../../assets/projects/two/a.png', coverAlt: 'A' })]; }],
    ['a gallery path that escapes its folder', 9, (c) => { c.projects = [project('one', { gallery: [{ src: `${asset}../two/a.png`, alt: 'A' }] })]; }],
    ['a role linked to a draft', 12, (c) => { c.projects.push(project('two', { draft: true })); c.experience.push(experience('x', { projects: ['two'] })); }],
  ];
  it.each(invalid)('rejects %s (rule %i)', (_name, rule, mutate) => {
    const c = validContent();
    mutate(c);
    expect(rules(c)).toEqual([rule]);
  });
});

describe('checkFiles', () => {
  const image = { path: 'src/assets/projects/one/a.png', bytes: 10, hasGps: false };
  it('accepts valid images', () =>
    expect(checkFiles([image, { ...image, path: 'public/favicon.svg' }, { ...image, bytes: MAX_IMAGE_BYTES }], ['src/a.ts'])).toEqual([]));
  it('rejects GPS metadata (rule 10)', () => expect(checkFiles([{ ...image, hasGps: true }], [])[0].rule).toBe(10));
  it('rejects oversized images (rule 11)', () => expect(checkFiles([{ ...image, bytes: MAX_IMAGE_BYTES + 1 }], [])[0].rule).toBe(11));
  it('rejects other formats (rule 11)', () => expect(checkFiles([{ ...image, path: 'public/a.webp' }], [])[0].rule).toBe(11));
  it.each(['mp4', 'mov', 'webm', 'mkv'])('rejects .%s (rule 11)', (ext) => expect(checkFiles([], [`public/a.${ext}`])[0].rule).toBe(11));
});

describe('checkStrict', () => {
  it('accepts finished content', () => expect(checkStrict([{ path: 'a', text: 'Done' }])).toEqual([]));
  it('rejects placeholders (rule 7)', () =>
    expect(checkStrict([{ path: 'a', text: 'x: "TODO(owner): y"' }])).toEqual([{ rule: 7, file: 'a', message: 'Contains TODO(owner)' }]));
});
