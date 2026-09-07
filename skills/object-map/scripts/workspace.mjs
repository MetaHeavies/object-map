import {realpathSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import { access } from 'node:fs/promises';
import path from 'node:path';

export async function findRoot(start = process.cwd()) {
  let current = path.resolve(start);
  while (true) {
    try { await access(path.join(current, '.object-map/map.json')); return current; }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    const parent = path.dirname(current);
    if (parent === current) throw new Error('No Object Map found. Run the skill’s scripts/install.mjs with the repository path first.');
    current = parent;
  }
}

export function isMain(url) {
  return !!process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(url);
}
