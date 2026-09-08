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

// The tooling is Node regardless of what the product is written in, so a
// version that predates the documented minimum should say so, not fail deep
// inside an unrelated call.
export const MINIMUM_NODE = '20.0.0';
export function nodeIsSupported(version = process.versions.node) {
  const [major, minor] = version.split('.').map(Number);
  const [needMajor, needMinor] = MINIMUM_NODE.split('.').map(Number);
  return major > needMajor || (major === needMajor && minor >= needMinor);
}
export function requireNode(version = process.versions.node) {
  if (!nodeIsSupported(version))
    throw new Error(`Object Map needs Node ${MINIMUM_NODE} or newer. This is Node ${version}.`);
}
