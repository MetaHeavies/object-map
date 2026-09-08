import {mkdir, readFile, writeFile, readdir, access, lstat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {initialize} from './store.mjs';
import {isMain, requireNode} from './workspace.mjs';
import {recordEvent} from './feedback.mjs';

const source = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const hash = text => createHash('sha256').update(text).digest('hex');
const start = '<!-- object-map -->', end = '<!-- /object-map -->';
const instructions = `${start}\n## Object Map\nAt every user turn, consult \`.object-map/map.json\` and follow \`.agents/skills/object-map/SKILL.md\`. Maintain this shared product model alongside authorized product changes; builder additions may describe unimplemented intentions. Preserve stable IDs and builder decisions. Before finishing, reconcile the affected concepts and record the review using the prompt hook token when supplied. Read the skill’s discovery reference when bootstrapping a new or existing product. Use its revision-checked writer; do not overwrite the map from a stale snapshot.\n${end}`;
// Works from subdirectories and new repositories that do not yet use git.
const locator = "const fs=require('node:fs'),p=require('node:path'),u=require('node:url');let d=process.cwd();while(!fs.existsSync(p.join(d,'.agents/skills/object-map/scripts/hook.mjs'))){const n=p.dirname(d);if(n===d)process.exit(0);d=n;}import(u.pathToFileURL(p.join(d,'.agents/skills/object-map/scripts/hook.mjs')).href).then(m=>m.runHook());";
export const hookCommand = `node -e "${locator}"`;
async function readOptional(file) {
  try { return await readFile(file, 'utf8'); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}
async function filesIn(directory, prefix = '') {
  const files = [];
  for (const item of await readdir(directory, {withFileTypes: true})) {
    const relative = path.join(prefix, item.name);
    if (item.isDirectory()) files.push(...await filesIn(path.join(directory, item.name), relative));
    else if (item.isFile()) files.push(relative);
  }
  return files;
}
async function assertNoSymlinks(root, relative) {
  let current = root;
  for (const part of relative.split(path.sep)) {
    current = path.join(current, part);
    try { if ((await lstat(current)).isSymbolicLink()) throw new Error(`Refusing to overwrite a symlink: ${current}`); }
    catch (error) { if (error.code === 'ENOENT') return; throw error; }
  }
}
export async function install(destination, {hosts = ['codex', 'claude'], hooks = true, upgrade = false, dev} = {}) {
  const root = path.resolve(destination);
  await access(root);
  if (hosts.some(host => !['codex', 'claude'].includes(host))) throw new Error('Supported hosts: codex, claude');
  await assertNoSymlinks(root, '.object-map');
  await assertNoSymlinks(root, '.object-map/install.json');
  const manifestPath = path.join(root, '.object-map/install.json');
  const prior = JSON.parse(await readOptional(manifestPath) || '{"files":{}}');
  const files = {...prior.files};
  const writes = [], backups = [];
  const stage = async (relative, content, managed = false) => {
    await assertNoSymlinks(root, relative);
    const existing = await readOptional(path.join(root, relative));
    if (managed) {
      if (existing !== null && existing !== content && files[relative] !== hash(existing)) {
        if (!upgrade) throw new Error(`Locally modified or older skill file: ${relative}. Re-run with --upgrade to back it up and install this version.`);
        backups.push({relative, content: existing});
      }
      files[relative] = hash(content);
    }
    if (existing !== content) writes.push({relative, content});
  };
  const contents = await filesIn(source);
  const fingerprints = [];
  for (const file of [...contents].sort()) fingerprints.push([file, hash(await readFile(path.join(source,file)))]);
  const build = hash(JSON.stringify(fingerprints)).slice(0,16);
  for (const prefix of ['.agents/skills/object-map', ...(hosts.includes('claude') ? ['.claude/skills/object-map'] : [])]) {
    for (const file of contents) await stage(path.join(prefix, file), await readFile(path.join(source, file), 'utf8'), true);
  }
  for (const name of ['AGENTS.md', ...(hosts.includes('claude') ? ['CLAUDE.md'] : [])]) {
    const text = await readOptional(path.join(root, name)) || '';
    let next;
    if (text.includes(start)) {
      const a = text.indexOf(start), b = text.indexOf(end, a);
      if (b < 0) throw new Error(`Unclosed Object Map instruction block in ${name}; repair it before installing.`);
      next = text.slice(0, a) + instructions + text.slice(b + end.length);
    } else next = text + (text.endsWith('\n') || !text ? '' : '\n') + '\n' + instructions + '\n';
    await stage(name, next);
  }
  if (hooks) for (const host of hosts) {
    const relative = host === 'claude' ? '.claude/settings.json' : '.codex/hooks.json';
    const config = JSON.parse(await readOptional(path.join(root, relative)) || '{}');
    if (!config || typeof config !== 'object' || Array.isArray(config)) throw new Error(`Invalid configuration: ${relative}`);
    config.hooks ??= {};
    if (typeof config.hooks !== 'object' || Array.isArray(config.hooks)) throw new Error(`Invalid hooks in ${relative}`);
    for (const event of ['SessionStart', 'UserPromptSubmit', 'Stop']) {
      const groups = config.hooks[event] || [];
      if (!Array.isArray(groups)) throw new Error(`Invalid ${event} hooks in ${relative}`);
      const cleaned = groups.map(group => ({...group, hooks: group.hooks.filter(h => !h.command?.includes('.agents/skills/object-map/scripts/hook.mjs'))})).filter(group => group.hooks.length);
      cleaned.push({hooks: [{type: 'command', command: hookCommand, timeout: 10}]});
      config.hooks[event] = cleaned;
    }
    await stage(relative, JSON.stringify(config, null, 2) + '\n');
  }
  const ignoreFile = '.object-map/.gitignore';
  let ignore = await readOptional(path.join(root, ignoreFile)) || '';
  for (const pattern of ['runtime/', 'backups/', 'dev/', '*.tmp', '*.lock']) if (!ignore.split('\n').includes(pattern)) ignore += `${ignore && !ignore.endsWith('\n') ? '\n' : ''}${pattern}\n`;
  await stage(ignoreFile, ignore);
  await initialize(root);
  const backupRoot = path.join(root, '.object-map/backups', new Date().toISOString().replace(/[:.]/g, '-'));
  for (const item of backups) {
    const file = path.join(backupRoot, item.relative);
    await mkdir(path.dirname(file), {recursive: true});
    await writeFile(file, item.content);
  }
  for (const item of writes) {
    const file = path.join(root, item.relative);
    await mkdir(path.dirname(file), {recursive: true});
    await writeFile(file, item.content);
  }
  const devEnabled = dev ?? prior.dev ?? false;
  await writeFile(manifestPath, JSON.stringify({version: 1, hosts, hooks, dev:devEnabled, build, files}, null, 2) + '\n');
  await recordEvent(root,'installed');
  return {root, hosts, hooks, dev:devEnabled, build, changed: writes.length, backups: backups.length, viewer: contents.includes(path.join('assets','app','index.html'))};
}
export async function installMain(args = process.argv.slice(2)) {
  requireNode();
  for (const arg of args.filter(arg=>arg.startsWith('--'))) {
    if (!['--no-hooks','--upgrade','--dev','--no-dev'].includes(arg) && !arg.startsWith('--hosts=')) throw new Error(`Unknown option: ${arg}`);
  }
  if(args.includes('--dev') && args.includes('--no-dev')) throw new Error('Choose --dev or --no-dev, not both.');
  const root = path.resolve(args.find(arg => !arg.startsWith('--')) || '.');
  const hostOption = args.find(arg => arg.startsWith('--hosts='));
  const result = await install(root, {hosts: hostOption ? hostOption.slice(8).split(',') : undefined, hooks: !args.includes('--no-hooks'), upgrade: args.includes('--upgrade'), dev:args.includes('--dev') ? true : args.includes('--no-dev') ? false : undefined});
  console.log(JSON.stringify(result, null, 2));
  const rel = path.relative(process.cwd(), root);
  const where = !rel ? '.' : rel.startsWith('..') ? root : rel;
  // Extracting the tarball inside the repository being mapped leaves a copy of
  // the skill in it that is not the installed one. Say so rather than let it
  // sit there looking official.
  const extractedInside = source === root || source.startsWith(root + path.sep);
  console.log([
    '',
    'Installed. Restart or trust the host so the project hooks activate.',
    ...(extractedInside ? ['', `This unpacked copy sits inside the repository. Delete ${path.relative(root, source) || '.'}/ — the installed skill is in .agents/skills/object-map.`] : []),
    ...(result.viewer ? [] : ['', 'This build has no canvas. Package the skill from the Object Map source to get the viewer.']),
    '',
    'Open the map:',
    '',
    ...(where === '.' ? [] : [`  cd ${where}`]),
    '  node .agents/skills/object-map/scripts/serve.mjs',
    '',
    'Then give the agent this:',
    '',
    '  Run Object Map on this repository. Inspect the implementation,',
    '  populate the map, and tell me what you were unsure about.',
    '',
  ].join('\n'));
}
if (isMain(import.meta.url)) installMain().catch(error => {console.error(error.message); process.exitCode = 1;});
