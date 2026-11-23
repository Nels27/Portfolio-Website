import type { Entry } from './schemas';

interface Ref {
  id: string;
}

/** Astro references are { collection, id }. The pure functions use plain ids. */
export const refIds = (refs: Ref[]): string[] => refs.map((r) => r.id);

export function adaptProject<T extends { tracks: Ref[] }>(entry: Entry<T>) {
  return { id: entry.id, data: { ...entry.data, tracks: refIds(entry.data.tracks), cover: undefined, gallery: [] } };
}

export function adaptExperience<T extends { tracks: Ref[]; projects: Ref[] }>(entry: Entry<T>) {
  const { data } = entry;
  return { id: entry.id, data: { ...data, tracks: refIds(data.tracks), projects: refIds(data.projects) } };
}

export function adaptSkill<T extends { evidence: Ref[] }>(entry: Entry<T>) {
  return { id: entry.id, data: { ...entry.data, evidence: refIds(entry.data.evidence) } };
}
