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
