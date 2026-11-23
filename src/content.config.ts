import { file, glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { defineCollection, reference } from 'astro:content';
import { parse } from 'yaml';
import {
  experienceSchema,
  githubSnapshotSchema,
  milestoneSchema,
  projectSchema,
  siteSchema,
  skillSchema,
  trackSchema,
} from './lib/schemas';

const tracks = z.array(reference('tracks')).min(1);

export const collections = {
  projects: defineCollection({
    loader: glob({
      pattern: '*.mdx',
      base: 'src/content/projects',
      // The default id generator strips dots, which would break rule 4.
      generateId: ({ entry }) => entry.replace(/\.mdx$/, '').toLowerCase(),
    }),
    schema: ({ image }) =>
      projectSchema.extend({
        tracks,
        cover: image().optional(),
        gallery: z
          .array(z.object({ src: image(), alt: z.string(), caption: z.string().optional() }))
          .default([]),
      }),
  }),
  experience: defineCollection({
    loader: glob({ pattern: '*.yaml', base: 'src/content/experience' }),
    schema: experienceSchema.extend({ tracks, projects: z.array(reference('projects')).default([]) }),
  }),
  skills: defineCollection({
    loader: file('src/content/skills.yaml'),
    schema: skillSchema.extend({ evidence: z.array(reference('projects')).min(1) }),
  }),
  milestones: defineCollection({ loader: file('src/content/milestones.yaml'), schema: milestoneSchema }),
  tracks: defineCollection({ loader: file('src/content/tracks.yaml'), schema: trackSchema }),
  site: defineCollection({
    loader: file('src/content/site.yaml', { parser: (text) => [{ id: 'site', ...parse(text) }] }),
    schema: siteSchema,
  }),
  github: defineCollection({
    loader: file('src/data/github.json', {
      parser: (text) => [{ id: 'snapshot', ...JSON.parse(text) }],
    }),
    schema: githubSnapshotSchema,
  }),
};
