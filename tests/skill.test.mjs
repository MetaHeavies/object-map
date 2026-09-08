import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, writeFile, readFile, readdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import {install} from '../scripts/install.mjs';
import {Store} from '../server/store.mjs';
import {makeObject} from '../src/model.mjs';
const temporary = () => mkdtemp(path.join(os.tmpdir(), 'object-map-skill-'));
const command = (root, args) => JSON.parse(execFileSync(process.execPath, [path.join(root, '.agents/skills/object-map/scripts/map.mjs'), ...args], {cwd:root, encoding:'utf8'}));

test('installer preserves host settings, is idempotent, protects local customization and backs up explicit upgrades', async () => {
  const root = await temporary();
  await mkdir(path.join(root,'.claude'));
  await writeFile(path.join(root,'CLAUDE.md'), 'Keep my Claude rules.\n');
  const existing={permissions:{deny:['Bash(rm *)']},hooks:{UserPromptSubmit:[{hooks:[{type:'command',command:'echo existing'}]}]}};
  await writeFile(path.join(root,'.claude/settings.json'),JSON.stringify(existing));
  await install(root);
  const config=JSON.parse(await readFile(path.join(root,'.claude/settings.json'),'utf8'));
  assert.deepEqual(config.permissions,existing.permissions);
  assert.equal(config.hooks.UserPromptSubmit[0].hooks[0].command,'echo existing');
  assert.ok((await readFile(path.join(root,'CLAUDE.md'),'utf8')).startsWith('Keep my Claude rules.'));
  assert.equal((await install(root)).changed,0);
  const skill=path.join(root,'.agents/skills/object-map/SKILL.md');
  await writeFile(skill,'Local skill customization');
  await assert.rejects(install(root),/--upgrade/);
  assert.equal(await readFile(skill,'utf8'),'Local skill customization');
  const result=await install(root,{upgrade:true});
  assert.equal(result.backups,1);
  const backups=await readdir(path.join(root,'.object-map/backups'));
  assert.equal(await readFile(path.join(root,'.object-map/backups',backups[0],'.agents/skills/object-map/SKILL.md'),'utf8'),'Local skill customization');
  assert.deepEqual(JSON.parse(await readFile(path.join(root,'.claude/settings.json'),'utf8')),config);
});

test('invalid host configuration fails before modifying repository instructions', async () => {
  const root=await temporary();
  await mkdir(path.join(root,'.claude'));
  await writeFile(path.join(root,'.claude/settings.json'),'{broken');
  await writeFile(path.join(root,'AGENTS.md'),'Keep me');
  await assert.rejects(install(root));
  assert.equal(await readFile(path.join(root,'AGENTS.md'),'utf8'),'Keep me');
});

test('installed writer preserves intended concepts, rejects stale writes and shares locks across Store instances', async () => {
  const root=await temporary();
  await install(root);
  const original=command(root,['read']);
  const candidate={...original.data,objects:[makeObject(original.data,'Pizza')]};
  const file=path.join(root,'candidate.json');
  await writeFile(file,JSON.stringify(candidate));
  command(root,['write',file,'--revision',original.revision]);
  assert.equal(command(root,['read']).data.objects[0].status,'intended');
  assert.throws(()=>command(root,['write',file,'--revision',original.revision]),/another session/);
  const a=new Store(root),b=new Store(root), current=await a.read('map');
  const results=await Promise.allSettled([a.write('map',{...candidate,objects:[{...candidate.objects[0],description:'One'}]},current.revision),b.write('map',{...candidate,objects:[{...candidate.objects[0],description:'Two'}]},current.revision)]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  assert.equal(results.filter(r=>r.status==='rejected').length,1);
});

test('the stop hook stays quiet on a turn that changed nothing and names the files when the product moved without the map', async () => {
  const root = await temporary();
  const git = (...args) =>
    execFileSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', ...args], {cwd: root, stdio: 'ignore'});
  git('init', '-q');
  await writeFile(path.join(root, 'product.js'), 'export const price = 1;\n');
  git('add', '-A');
  git('commit', '-qm', 'base');
  await install(root);
  const config = JSON.parse(await readFile(path.join(root, '.claude/settings.json'), 'utf8'));
  const hook = config.hooks.UserPromptSubmit[0].hooks[0].command;
  const run = (input) =>
    JSON.parse(execFileSync('/bin/sh', ['-c', hook], {cwd: root, input: JSON.stringify({cwd: root, session_id: 'drift', ...input}), encoding: 'utf8'}));

  run({hook_event_name: 'UserPromptSubmit'});
  assert.deepEqual(run({hook_event_name: 'Stop'}), {}, 'A turn that changed nothing is not asked to review it');

  run({hook_event_name: 'UserPromptSubmit'});
  await writeFile(path.join(root, 'product.js'), 'export const price = 2;\n');
  const blocked = run({hook_event_name: 'Stop'});
  assert.equal(blocked.decision, 'block', 'Changing the product without the map is stopped');
  assert.match(blocked.reason, /product\.js/, 'The reminder names what moved');

  run({hook_event_name: 'UserPromptSubmit'});
  await writeFile(path.join(root, '.object-map/runtime/scratch.json'), '{}');
  assert.deepEqual(run({hook_event_name: 'Stop'}), {}, "Object Map's own files are not product changes");
});
test('both installed hook commands inject fresh context from nested cwd and require a bounded review', async () => {
  for (const host of ['claude','codex']) {
    const root=await temporary();
    await install(root);
    const nested=path.join(root,'src/nested');
    await mkdir(nested,{recursive:true});
    const config=JSON.parse(await readFile(path.join(root,host==='claude'?'.claude/settings.json':'.codex/hooks.json'),'utf8'));
    const hook=config.hooks.UserPromptSubmit[0].hooks[0].command;
    const run=input=>JSON.parse(execFileSync('/bin/sh',['-c',hook],{cwd:nested,input:JSON.stringify({cwd:nested,session_id:'test-session',...input}),encoding:'utf8'}));
    const initial=run({hook_event_name:'SessionStart'});
    assert.ok(initial.hookSpecificOutput.additionalContext.includes('Current revision:'));
    const context=run({hook_event_name:'UserPromptSubmit'}).hookSpecificOutput.additionalContext;
    const token=context.match(/review ([a-f0-9]{32})/)[1];
    assert.equal(run({hook_event_name:'Stop'}).decision,'block');
    assert.deepEqual(run({hook_event_name:'Stop'}),{});
    assert.deepEqual(run({hook_event_name:'Stop',stop_hook_active:true}),{});
    const fresh=run({hook_event_name:'UserPromptSubmit'}).hookSpecificOutput.additionalContext;
    const freshToken=fresh.match(/review ([a-f0-9]{32})/)[1];
    assert.notEqual(freshToken,token);
    command(root,['review',freshToken,'Discussion only; no product structure changed.']);
    assert.deepEqual(run({hook_event_name:'Stop'}),{});
    const store=new Store(root), current=await store.read('map');
    await store.write('map',{...current.data,objects:[makeObject(current.data,'Pizza')]},current.revision);
    assert.equal(run({hook_event_name:'Stop'}).decision,'block','A review of an older map revision does not satisfy the current turn');
    assert.ok(run({hook_event_name:'UserPromptSubmit'}).hookSpecificOutput.additionalContext.includes('Pizza'));
    await writeFile(path.join(root,'.object-map/map.json'),'broken');
    const failed=run({hook_event_name:'UserPromptSubmit'});
    assert.ok(failed.systemMessage.includes('needs attention'));
    assert.equal(failed.decision,undefined);
  }
});

test('the documented Node minimum is enforced before anything is written', async () => {
  const {nodeIsSupported, requireNode, MINIMUM_NODE} = await import('../skills/object-map/scripts/workspace.mjs');
  assert.equal(MINIMUM_NODE, '22.12.0');
  for (const version of ['18.20.4', '20.11.0', '22.11.0']) assert.equal(nodeIsSupported(version), false, version);
  for (const version of ['22.12.0', '22.14.1', '24.0.0']) assert.equal(nodeIsSupported(version), true, version);
  assert.throws(() => requireNode('20.11.0'), /Node 22\.12\.0 or newer. This is Node 20\.11\.0/);
  assert.equal(nodeIsSupported(), true, 'the test runner itself meets the documented minimum');
});
