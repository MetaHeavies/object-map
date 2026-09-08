import {readFile, writeFile, access} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {Store} from './store.mjs';
import {validateMap} from './model.mjs';
import {findRoot, isMain} from './workspace.mjs';
import {recordEvent, addFeedback, exportFeedback, devConfig} from './feedback.mjs';

// The agent records what it could not settle in .object-map/discovery.md. It is
// the most useful thing it writes and nothing surfaced it, so check reads it back.
export function unresolvedQuestions(notes) {
  const lines = (notes || '').split('\n');
  const start = lines.findIndex(line => /^##\s+unresolved questions\s*$/i.test(line.trim()));
  if (start < 0) return [];
  const end = lines.findIndex((line, index) => index > start && /^##\s/.test(line));
  return lines.slice(start + 1, end < 0 ? undefined : end).join('\n').trim().split(/\n(?=\s*(?:\d+\.|[-*])\s)/)
    .map(entry => entry.trim()).filter(Boolean);
}

// A reading of the map you can act on: what connects to nothing, what nobody
// can act on, what has no definition, and labels that only repeat their target.
export function checkMap(map) {
  const plain = value => (value || '').toLowerCase().replace(/[^a-z]/g, '');
  const inbound = Object.fromEntries(map.objects.map(object => [object.id, 0]));
  for (const object of map.objects)
    for (const relationship of object.relationships || [])
      if (inbound[relationship.target] !== undefined) inbound[relationship.target]++;
  return map.objects.map(object => {
    const out = object.relationships || [], into = inbound[object.id], warnings = [];
    if (!out.length && !into) warnings.push('connects to nothing');
    if (!(object.actions || []).length && !into) warnings.push('nothing can be done to it');
    if (!object.description) warnings.push('no definition');
    const echoes = out.filter(relationship => {
      const target = map.objects.find(candidate => candidate.id === relationship.target);
      return target && plain(relationship.name) === plain(target.name);
    });
    if (echoes.length) warnings.push(`label repeats its target: ${echoes.map(r => r.name).join(', ')}`);
    if (object.status !== 'intended' && !(object.evidence || []).length) warnings.push('no evidence recorded');
    return {
      name: object.name, status: object.status,
      attributes: (object.attributes || []).length, relationships: out.length, inbound: into,
      actions: (object.actions || []).length, states: (object.states || []).length,
      filterable: (object.attributes || []).filter(a => a.filterable).map(a => a.name),
      warnings,
    };
  });
}

export async function main(args = process.argv.slice(2)) {
  const [command, ...rest] = args;
  const root = await findRoot();
  const store = new Store(root);
  if (command === 'read') return store.read('map');
  if (command === 'write') {
    const revision = rest.indexOf('--revision');
    if (!rest[0] || revision < 0 || !rest[revision + 1]) throw new Error('Usage: map.mjs write candidate.json --revision REVISION');
    const data = JSON.parse(await readFile(path.resolve(rest[0]), 'utf8'));
    return store.write('map', data, rest[revision + 1]);
  }
  if (command === 'validate') {
    const map = rest[0] ? JSON.parse(await readFile(path.resolve(rest[0]), 'utf8')) : (await store.read('map')).data;
    validateMap(map);
    return {valid: true, objects: map.objects.length};
  }
  if (command === 'review') {
    const [token, ...note] = rest;
    if (!/^[a-f0-9]{32}$/.test(token || '') || !note.join(' ').trim()) throw new Error('Usage: map.mjs review TOKEN "What changed, or why no map update was needed"');
    const file = path.join(root, '.object-map/runtime', `${token}.json`);
    const receipt = JSON.parse(await readFile(file, 'utf8'));
    const current = await store.read('map');
    validateMap(current.data);
    receipt.review = {revision: current.revision, note: note.join(' '), at: new Date().toISOString()};
    await writeFile(file, JSON.stringify(receipt, null, 2) + '\n');
    await recordEvent(root,'review',{turn:token,outcome:receipt.revision===current.revision?'unchanged':'updated'});
    return {reviewed: true, revision: current.revision};
  }
  if (command === 'check') {
    const current = await store.read('map');
    validateMap(current.data);
    const notesPath = path.join(root, '.object-map/discovery.md');
    let notes = null;
    try { notes = await readFile(notesPath, 'utf8'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    return {root, objects: checkMap(current.data), notes: notes !== null, questions: unresolvedQuestions(notes)};
  }
  if (command === 'doctor') {
    const checks = [];
    for (const relative of ['AGENTS.md', 'CLAUDE.md', '.agents/skills/object-map/SKILL.md', '.claude/skills/object-map/SKILL.md', '.codex/hooks.json', '.claude/settings.json', '.agents/skills/object-map/assets/app/index.html']) {
      try { await access(path.join(root, relative)); checks.push({file: relative, present: true}); }
      catch (error) { if (error.code !== 'ENOENT') throw error; checks.push({file: relative, present: false}); }
    }
    const current = await store.read('map');
    validateMap(current.data);
    const config=await devConfig(root);
    return {root, node: process.version, dev:!!config.dev, build:config.build, objects: current.data.objects.length, revision: current.revision, checks,
      note: 'Files present does not prove host activation. Restart/trust the host as needed and verify Object Map context and a review token on a fresh prompt.'};
  }
  if (command === 'feedback') {
    if (rest[0] === 'export') {
      if(rest.slice(1).some(arg=>arg!=='--metrics-only')) throw new Error('Usage: map.mjs feedback export [--metrics-only]');
      return exportFeedback(root,{metricsOnly:rest.includes('--metrics-only')});
    }
    const [category, summary, ...options]=rest;
    const fields={};
    for(let i=0;i<options.length;i+=2){
      const key=options[i].replace(/^--/,'');
      if(!['expected','actual','steps'].includes(key)||options[i+1]===undefined) throw new Error('Feedback options: --expected TEXT --actual TEXT --steps TEXT');
      fields[key]=options[i+1];
    }
    return addFeedback(root,category,summary,fields);
  }
  throw new Error('Commands: read, write FILE --revision REVISION, validate [FILE], review TOKEN NOTE, check, doctor. Run scripts/serve.mjs to open the canvas.');
}
function report(objects) {
  const width = Math.max(...objects.map(object => object.name.length));
  const lines = objects.map(object => {
    const counts = `${object.attributes}a ${object.relationships}->${object.inbound}<- ${object.actions}c ${object.states}s`;
    const mark = object.status === 'intended' ? 'o' : '*';
    return `${mark} ${object.name.padEnd(width)}  ${counts}${object.warnings.length ? `   ! ${object.warnings.join('; ')}` : ''}`;
  });
  const filterable = objects.flatMap(object => object.filterable.map(name => `${object.name}.${name}`));
  const flagged = objects.filter(object => object.warnings.length).length;
  return [
    ...lines,
    '',
    `${objects.length} objects, ${flagged} worth a second look. * observed, o intended. 2->3<- is two links out, three in.`,
    `Filterable: ${filterable.length ? filterable.join(', ') : 'nothing marked'}`,
  ].join('\n');
}
function notesReport({notes, questions}) {
  if (!notes) return ['', 'No discovery notes. The agent writes .object-map/discovery.md when it maps a repository.'];
  if (!questions.length) return ['', 'Discovery notes: .object-map/discovery.md (no unresolved questions recorded).'];
  return ['', `The agent left ${questions.length} unresolved ${questions.length === 1 ? 'question' : 'questions'} in .object-map/discovery.md:`, '', ...questions.map(question => question.replace(/^/gm, '  ')), ''];
}
if (isMain(import.meta.url)) {
  main()
    .then(result => console.log(process.argv[2] === 'check'
      ? [report(result.objects), ...notesReport(result)].join('\n')
      : JSON.stringify(result, null, 2)))
    .catch(error => {console.error(error.message); process.exitCode = 1;});
}
