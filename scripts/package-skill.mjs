import {cp, mkdir, rm} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
const destination = new URL('../skills/object-map/assets/app/', import.meta.url);
await rm(destination, {recursive:true, force:true});
await mkdir(destination, {recursive:true});
await cp(new URL('../dist/', import.meta.url), destination, {recursive:true});
execFileSync('tar', ['-czf', 'dist/object-map-skill.tgz', '-C', 'skills', 'object-map']);
console.log('Portable skill: dist/object-map-skill.tgz');
