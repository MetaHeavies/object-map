import {readFile, writeFile, access} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {Store} from './store.mjs';
import {validateMap} from './model.mjs';
import {findRoot, isMain} from './workspace.mjs';
import {recordEvent, addFeedback, exportFeedback, devConfig} from './feedback.mjs';

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
  throw new Error('Commands: read, write FILE --revision REVISION, validate [FILE], review TOKEN NOTE, doctor. Run scripts/serve.mjs to open the canvas.');
}
if (isMain(import.meta.url)) {
  main().then(result => console.log(JSON.stringify(result, null, 2))).catch(error => {console.error(error.message); process.exitCode = 1;});
}
