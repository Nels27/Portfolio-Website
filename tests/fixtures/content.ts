import type { ContentSet } from '../../src/lib/integrity';
import type { Entry, ExperienceData, ProjectData, SkillData, TrackData } from '../../src/lib/schemas';

export const project = (id: string, data: Partial<ProjectData> = {}): Entry<ProjectData> => ({
  id,
  data: {
    title: id, summary: 'Summary', tracks: ['alpha'], role: 'Lead', period: { start: '2025-01' },
    stack: ['TypeScript'], outcomes: ['Outcome'], featured: false, confidential: false, draft: false,
    gallery: [], ...data,
  },
});
export const experience = (id: string, data: Partial<ExperienceData> = {}): Entry<ExperienceData> => ({
  id,
  data: {
    organization: 'Org', title: 'Engineer', tracks: ['alpha'], start: '2024-01', highlights: ['Did it'],
    projects: ['one'], ...data,
  },
});
export const skill = (id: string, data: Partial<SkillData> = {}): Entry<SkillData> => ({
  id,
  data: { id, name: id, category: 'testing', evidence: ['one'], ...data },
});
export const track = (id: string, data: Partial<TrackData> = {}): Entry<TrackData> => ({
  id,
  data: { id, title: id, headline: 'Headline', description: 'Text', order: 1, default: false, ...data },
});

/** A content set that passes every rule. */
export const validContent = (): ContentSet => ({
  projects: [project('one')],
  experience: [experience('role')],
  skills: [skill('tests')],
  milestones: [{ id: 'degree', data: { id: 'degree', date: '2019-05', title: 'Degree', kind: 'education' } }],
  tracks: [track('alpha', { default: true })],
});
