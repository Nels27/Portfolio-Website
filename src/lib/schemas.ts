import { z } from 'astro/zod';

// No .refine()/.superRefine() on object schemas here: content.config.ts extends
// them, and Zod throws when a refined object is extended. Cross-field rules
// live in integrity.ts.

export interface Entry<T> {
  id: string;
  data: T;
}

export const SKILL_CATEGORIES = [
  'languages',
  'testing',
  'infrastructure',
  'ai-ml',
  'hardware',
  'leadership',
] as const;

const text = z.string().min(1);
const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const httpsUrl = z.url({ protocol: /^https$/ });

export const dateSchema = z
  .string()
  .regex(/^(?:\d{4}-(?:0[1-9]|1[0-2])$|TODO\(owner\))/, 'Expected YYYY-MM or a TODO(owner) placeholder');

export const projectSchema = z.object({
  title: text,
  summary: text.max(160),
  tracks: z.array(z.string()).min(1),
  role: text,
  period: z.object({ start: dateSchema, end: dateSchema.optional() }),
  stack: z.array(text).min(1),
  outcomes: z.array(text).min(1),
  repo: z.string().regex(/^[\w.-]+\/[\w.-]+$/).optional(),
  demo: httpsUrl.optional(),
  featured: z.boolean().default(false),
  confidential: z.boolean().default(false),
  draft: z.boolean().default(false),
  cover: z.string().optional(),
  coverAlt: z.string().optional(),
  gallery: z
    .array(z.object({ src: z.string(), alt: z.string(), caption: z.string().optional() }))
    .default([]),
});

export const experienceSchema = z.object({
  organization: text,
  title: text,
  tracks: z.array(z.string()).min(1),
  start: dateSchema,
  end: dateSchema.optional(),
  location: z.string().optional(),
  highlights: z.array(text).min(1),
  projects: z.array(z.string()).default([]),
});

export const skillSchema = z.object({
  id: slug,
  name: text,
  category: z.enum(SKILL_CATEGORIES),
  evidence: z.array(z.string()).min(1),
});

export const milestoneSchema = z.object({
  id: slug,
  date: dateSchema,
  title: text,
  kind: z.enum(['education', 'career', 'community', 'certification', 'project']),
  detail: z.string().optional(),
});

export const trackSchema = z.object({
  id: slug,
  title: text,
  headline: text.max(90),
  description: text,
  order: z.number().int(),
  default: z.boolean().default(false),
});

export const siteSchema = z.object({
  name: text,
  headline: text,
  email: z.email(),
  github: httpsUrl,
  linkedin: httpsUrl,
});

export const githubRepoSchema = z.object({
  nameWithOwner: text,
  description: z.string().nullable(),
  url: httpsUrl,
  homepageUrl: z.string().nullable(),
  primaryLanguage: z.string().nullable(),
  languages: z.array(z.string()),
  stargazerCount: z.number().int(),
  pushedAt: z.string().nullable(),
  isArchived: z.boolean(),
  lastCommit: z.string().nullable(),
  status: z.string(),
});

export const githubSnapshotSchema = z.object({
  fetchedAt: z.string(),
  source: z.enum(['live', 'cache', 'fixture']),
  repos: z.record(z.string(), githubRepoSchema),
});

export type ProjectData = z.infer<typeof projectSchema>;
export type ExperienceData = z.infer<typeof experienceSchema>;
export type SkillData = z.infer<typeof skillSchema>;
export type MilestoneData = z.infer<typeof milestoneSchema>;
export type TrackData = z.infer<typeof trackSchema>;
export type SiteData = z.infer<typeof siteSchema>;
export type GitHubRepo = z.infer<typeof githubRepoSchema>;
export type GitHubSnapshot = z.infer<typeof githubSnapshotSchema>;
