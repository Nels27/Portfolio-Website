import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import exifr from 'exifr';
import { checkContent, checkFiles, checkStrict, type ImageFile } from '../src/lib/integrity';
import { listFiles, loadContent } from './lib/content';

const IMAGE = /\.(?:png|jpe?g|svg|webp|avif|gif|heic|tiff?)$/i;
const GPS_READABLE = /\.(?:png|jpe?g)$/i;

const { values } = parseArgs({ options: { root: { type: 'string', default: '.' } } });
const root = resolve(values.root);

const { content, files, errors } = await loadContent(root);
const paths = [...(await listFiles(root, 'src')), ...(await listFiles(root, 'public'))];

const images: ImageFile[] = [];
for (const path of paths) {
  if (!IMAGE.test(path) || !(path.startsWith('src/assets/') || path.startsWith('public/'))) continue;
  const buffer = await readFile(join(root, path));
  let hasGps = false;
  if (GPS_READABLE.test(path)) {
    try {
      hasGps = Boolean(await exifr.gps(buffer));
    } catch (error) {
      errors.push({ rule: 10, file: path, message: `Cannot read image metadata: ${String(error)}` });
    }
  }
  images.push({ path, bytes: buffer.length, hasGps });
}

const violations = [
  ...errors,
  ...checkContent(content),
  ...checkFiles(images, paths),
  ...(process.env.STRICT_CONTENT === 'true' ? checkStrict(files) : []),
];

for (const v of violations) console.error(`[rule ${v.rule}] ${v.file}: ${v.message}`);
if (violations.length > 0) process.exit(1);
console.log(`Content OK: ${files.length} files, ${images.length} images`);
