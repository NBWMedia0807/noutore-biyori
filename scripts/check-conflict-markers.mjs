#!/usr/bin/env node
import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const IGNORE_DIRS = new Set([
  '.git',
  'node_modules',
  '.svelte-kit',
  'build',
  '.vercel',
  'dist'
]);
const IGNORE_FILES = new Set(['scripts/check-conflict-markers.mjs']);
const MARKERS = ['<<<<<<<', '=======', '>>>>>>>'];

/**
 * @param {string} dir
 */
async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const results = [];

  for (const entry of entries) {
    if (IGNORE_DIRS.has(entry.name)) continue;
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      results.push(...(await walk(fullPath)));
    } else if (entry.isFile()) {
      const relativePath = relative(ROOT, fullPath);
      if (IGNORE_FILES.has(relativePath)) continue;
      const text = await readFile(fullPath, 'utf8');
      if (MARKERS.some((marker) => text.includes(marker))) {
        const lines = text.split(/\r?\n/);
        const markerLines = [];
        for (let i = 0; i < lines.length; i += 1) {
          if (MARKERS.some((marker) => lines[i].includes(marker))) {
            markerLines.push(i + 1);
          }
        }
        results.push({
          path: relativePath,
          lines: markerLines
        });
      }
    }
  }

  return results;
}

const main = async () => {
  const conflicts = await walk(ROOT);

  if (conflicts.length === 0) {
    console.log('No conflict markers found.');
    return;
  }

  console.error('Conflict markers detected in the following files:');
  for (const conflict of conflicts) {
    console.error(` - ${conflict.path}:${conflict.lines.join(',')}`);
  }
  process.exitCode = 1;
};

main().catch((error) => {
  console.error('Failed to scan repository for conflict markers.');
  console.error(error);
  process.exitCode = 1;
});
