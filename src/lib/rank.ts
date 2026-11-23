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
