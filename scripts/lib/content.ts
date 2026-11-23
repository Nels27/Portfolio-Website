import { readFile, readdir } from 'node:fs/promises';
import { basename, join, relative, sep } from 'node:path';
import { parse } from 'yaml';
import type { ContentSet, RawFile, Violation } from '../../src/lib/integrity';
import {
  experienceSchema,
  milestoneSchema,
  projectSchema,
  siteSchema,
  skillSchema,
  trackSchema,
  type Entry,
} from '../../src/lib/schemas';

interface Schema<T> {
  safeParse(value: unknown): { success: true; data: T } | { success: false; error: { message: string } };
}

/** Every file under dir, as repo-relative paths with forward slashes. Missing folders are empty. */
export async function listFiles(root: string, dir: string): Promise<string[]> {
  const entries = await readdir(join(root, dir), { recursive: true, withFileTypes: true }).catch(() => []);
  return entries
    .filter((e) => e.isFile())
    .map((e) => relative(root, join(e.parentPath, e.name)).split(sep).join('/'))
    .sort();
}

function frontmatter(text: string): unknown {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  if (!match) throw new Error('Missing frontmatter');
  return parse(match[1]);
}

export interface LoadedContent {
  content: ContentSet;
  files: RawFile[];
  /** Files that don't parse or don't match their schema, reported as rule 0. */
  errors: Violation[];
}

export async function loadContent(root: string): Promise<LoadedContent> {
  const errors: Violation[] = [];
  const files: RawFile[] = [];
  for (const path of await listFiles(root, 'src/content'))
    files.push({ path, text: await readFile(join(root, path), 'utf8') });

  const fail = (file: string, error: unknown) =>
    errors.push({ rule: 0, file, message: error instanceof Error ? error.message : String(error) });

  function check<T>(schema: Schema<T>, id: string, value: unknown, file: string): Entry<T>[] {
    const result = schema.safeParse(value);
    if (result.success) return [{ id, data: result.data }];
    fail(file, result.error.message);
    return [];
  }

  function folder<T>(dir: string, ext: string, schema: Schema<T>, read: (t: string) => unknown): Entry<T>[] {
    return files
      .filter((f) => f.path.startsWith(`src/content/${dir}/`) && f.path.endsWith(ext))
      .flatMap((f) => {
        try {
          return check(schema, basename(f.path, ext).toLowerCase(), read(f.text), f.path);
        } catch (error) {
          fail(f.path, error);
          return [];
        }
      });
  }

  function list<T>(name: string, schema: Schema<T>): Entry<T>[] {
    const path = `src/content/${name}.yaml`;
    const file = files.find((f) => f.path === path);
    try {
      const rows: unknown = parse(file?.text ?? '');
      if (!Array.isArray(rows)) throw new Error('Expected a list');
      const seen = new Set<string>();
      return rows.flatMap((row) => {
        const id = String(row?.id);
        if (seen.has(id)) fail(path, new Error(`Duplicate id "${id}"`));
        seen.add(id);
        return check(schema, id, row, path);
      });
    } catch (error) {
      fail(path, error);
      return [];
    }
  }

  const content: ContentSet = {
    projects: folder('projects', '.mdx', projectSchema, frontmatter),
    experience: folder('experience', '.yaml', experienceSchema, (t) => parse(t)),
    skills: list('skills', skillSchema),
    milestones: list('milestones', milestoneSchema),
    tracks: list('tracks', trackSchema),
  };

  const site = files.find((f) => f.path === 'src/content/site.yaml');
  try {
    check(siteSchema, 'site', parse(site?.text ?? ''), 'src/content/site.yaml');
  } catch (error) {
    fail('src/content/site.yaml', error);
  }
  return { content, files, errors };
}
