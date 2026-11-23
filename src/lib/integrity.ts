import type { Entry, ExperienceData, MilestoneData, ProjectData, SkillData, TrackData } from './schemas';

export const MIN_PROJECTS_PER_TRACK = 1;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export interface ContentSet {
  projects: Entry<ProjectData>[];
  experience: Entry<ExperienceData>[];
  skills: Entry<SkillData>[];
  milestones: Entry<MilestoneData>[];
  tracks: Entry<TrackData>[];
}
export interface ImageFile {
  path: string;
  bytes: number;
  hasGps: boolean;
}
export interface RawFile {
  path: string;
  text: string;
}
export interface Violation {
  rule: number;
  file: string;
  message: string;
}

const projectFile = (id: string) => `src/content/projects/${id}.mdx`;
const experienceFile = (id: string) => `src/content/experience/${id}.yaml`;
const SKILLS = 'src/content/skills.yaml';
const TRACKS = 'src/content/tracks.yaml';

export function checkContent(c: ContentSet): Violation[] {
  const out: Violation[] = [];
  const add = (rule: number, file: string, message: string) => out.push({ rule, file, message });
  const projectIds = new Set(c.projects.map((p) => p.id));
  const trackIds = new Set(c.tracks.map((t) => t.id));
  const drafts = new Set(c.projects.filter((p) => p.data.draft).map((p) => p.id));

  const need = (ids: Set<string>, refs: string[], file: string) => {
    for (const ref of refs) if (!ids.has(ref)) add(1, file, `Unknown reference "${ref}"`);
  };

  for (const { id, data } of c.projects) {
    const file = projectFile(id);
    need(trackIds, data.tracks, file);
    if (data.repo && data.repo.split('/')[1].toLowerCase() !== id)
      add(4, file, `Filename must equal the repository name in "${data.repo}", lowercased`);
    if (data.confidential && (data.repo || data.demo))
      add(5, file, 'Confidential projects cannot have a repo or demo');
    if (data.cover && !data.coverAlt?.trim()) add(8, file, 'cover needs a non-empty coverAlt');
    for (const item of data.gallery)
      if (!item.alt.trim()) add(8, file, `Gallery image "${item.src}" needs alt text`);
    const folder = `../../assets/projects/${id}/`;
    for (const src of [data.cover, ...data.gallery.map((g) => g.src)])
      if (src && (!src.startsWith(folder) || src.slice(folder.length).includes('..')))
        add(9, file, `Image "${src}" must be in src/assets/projects/${id}/`);
  }

  for (const { id, data } of c.experience) {
    const file = experienceFile(id);
    need(trackIds, data.tracks, file);
    need(projectIds, data.projects, file);
    for (const ref of data.projects)
      if (drafts.has(ref)) add(12, file, `Links to draft project "${ref}"`);
  }

  for (const { id, data } of c.skills) {
    need(projectIds, data.evidence, SKILLS);
    for (const ref of data.evidence)
      if (drafts.has(ref)) add(6, SKILLS, `Skill "${id}" uses draft project "${ref}" as evidence`);
  }

  const defaults = c.tracks.filter((t) => t.data.default).length;
  if (defaults !== 1) add(2, TRACKS, `Expected exactly 1 default track, found ${defaults}`);
  for (const { id } of c.tracks) {
    const count = c.projects.filter((p) => !p.data.draft && p.data.tracks.includes(id)).length;
    if (count < MIN_PROJECTS_PER_TRACK)
      add(3, TRACKS, `Track "${id}" has ${count} projects, needs ${MIN_PROJECTS_PER_TRACK}`);
  }
  return out;
}

export function checkFiles(images: ImageFile[], allPaths: string[]): Violation[] {
  const out: Violation[] = [];
  for (const { path, bytes, hasGps } of images) {
    if (hasGps) out.push({ rule: 10, file: path, message: 'Image contains GPS metadata' });
    if (bytes > MAX_IMAGE_BYTES) out.push({ rule: 11, file: path, message: 'Image is larger than 5 MB' });
    if (!/\.(?:png|jpe?g|svg)$/i.test(path))
      out.push({ rule: 11, file: path, message: 'Images must be .png, .jpg, .jpeg or .svg' });
  }
  for (const path of allPaths)
    if (/\.(?:mp4|mov|webm|mkv)$/i.test(path))
      out.push({ rule: 11, file: path, message: 'Video files are not allowed' });
  return out;
}

export function checkStrict(files: RawFile[]): Violation[] {
  return files
    .filter((f) => f.text.includes('TODO(owner)'))
    .map((f) => ({ rule: 7, file: f.path, message: 'Contains TODO(owner)' }));
}
