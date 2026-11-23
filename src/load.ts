import { getCollection, getEntry, type CollectionEntry } from 'astro:content';
import { adaptExperience, adaptProject, adaptSkill } from './lib/adapt';
import { compareDates } from './lib/dates';
import { sortExperience } from './lib/rank';

async function one<C extends 'site' | 'github'>(collection: C, id: string) {
  const entry = await getEntry(collection, id);
  if (!entry) throw new Error(`Missing ${collection} data`);
  return entry.data as CollectionEntry<C>['data'];
}

export const loadSite = () => one('site', 'site');
export const loadGitHub = () => one('github', 'snapshot');

/** Every collection as plain, sorted data. Drafts are removed. */
export async function loadAll() {
  const projectEntries = (await getCollection('projects')).filter((p) => !p.data.draft);
  const tracks = (await getCollection('tracks')).sort((a, b) => a.data.order - b.data.order);
  const milestones = (await getCollection('milestones')).sort((a, b) =>
    compareDates(a.data.date, b.data.date),
  );
  return {
    projectEntries,
    projects: projectEntries.map(adaptProject),
    experience: sortExperience((await getCollection('experience')).map(adaptExperience)),
    skills: (await getCollection('skills')).map(adaptSkill),
    milestones,
    tracks,
  };
}
