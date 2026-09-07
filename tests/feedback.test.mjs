import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, access, readFile, writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import {install} from '../scripts/install.mjs';
import {Store} from '../server/store.mjs';
import {makeObject} from '../src/model.mjs';
import {recordEvent, exportFeedback} from '../skills/object-map/scripts/feedback.mjs';
const temporary=()=>mkdtemp(path.join(os.tmpdir(),'object-map-feedback-'));
const cli=(root,args)=>JSON.parse(execFileSync(process.execPath,[path.join(root,'.agents/skills/object-map/scripts/map.mjs'),...args],{cwd:root,encoding:'utf8',stdio:['pipe','pipe','pipe']}));

test('dev mode is opt-in, survives upgrades, can be disabled, and exports correlate with installed content',async()=>{
  const root=await temporary();
  await install(root);
  await recordEvent(root,'hook',{phase:'SessionStart',outcome:'context'});
  await assert.rejects(access(path.join(root,'.object-map/dev')));
  const first=await install(root,{dev:true});
  assert.match(first.build,/^[a-f0-9]{16}$/);
  assert.equal((await install(root)).dev,true);
  assert.equal((await install(root)).build,first.build);
  assert.ok((await readFile(path.join(root,'.object-map/.gitignore'),'utf8')).split('\n').includes('dev/'));
  await recordEvent(root,'hook',{phase:'UserPromptSubmit',outcome:'context',prompt:'PRIVATE_PROMPT',source:'PRIVATE_SOURCE',path:root,objects:2});
  const report=cli(root,['feedback','export']);
  assert.ok(report.events.every(event=>event.build===first.build));
  const raw=JSON.stringify(report);
  for(const forbidden of ['PRIVATE_PROMPT','PRIVATE_SOURCE',root])assert.ok(!raw.includes(forbidden));
  const old=await readFile(path.join(root,'.object-map/dev/events.jsonl'),'utf8');
  await install(root,{dev:false});
  await recordEvent(root,'hook',{phase:'Stop',outcome:'continued'});
  assert.equal(await readFile(path.join(root,'.object-map/dev/events.jsonl'),'utf8'),old);
  assert.equal(cli(root,['feedback','export']).devEnabled,false);
});

test('writes and host hooks produce useful diagnostics without model labels or review prose',async()=>{
  const root=await temporary();await install(root,{dev:true});
  const script=path.join(root,'.agents/skills/object-map/scripts/hook.mjs');
  const hook=event=>JSON.parse(execFileSync(process.execPath,[script],{cwd:root,input:JSON.stringify({cwd:root,session_id:'PRIVATE_SESSION',prompt:'PRIVATE_PROMPT',...event}),encoding:'utf8'}));
  const context=hook({hook_event_name:'UserPromptSubmit'}).hookSpecificOutput.additionalContext;
  assert.ok(context.includes('Development feedback'));
  const token=context.match(/review ([a-f0-9]{32})/)[1];
  const store=new Store(root),snapshot=await store.read('map');
  await store.write('map',{...snapshot.data,objects:[makeObject(snapshot.data,'PRIVATE_OBJECT')]},snapshot.revision);
  await assert.rejects(store.write('map',snapshot.data,snapshot.revision));
  assert.equal(hook({hook_event_name:'Stop'}).decision,'block');
  cli(root,['review',token,'PRIVATE_REVIEW_TEXT']);
  assert.deepEqual(hook({hook_event_name:'Stop'}),{});
  const report=cli(root,['feedback','export']);
  assert.equal(report.totals['write.success'],1);
  assert.equal(report.totals['write_error.conflict'],1);
  assert.equal(report.totals['review.updated'],1);
  assert.equal(report.totals['hook.Stop.reminded'],1);
  const serialized=JSON.stringify(report);
  for(const secret of ['PRIVATE_OBJECT','PRIVATE_SESSION','PRIVATE_PROMPT','PRIVATE_REVIEW_TEXT']) assert.ok(!serialized.includes(secret));
});

test('structured feedback is retained explicitly and omitted by metrics-only export',async()=>{
  const root=await temporary();await install(root,{dev:true});
  const before=await new Store(root).read('map');
  const note=cli(root,['feedback','mapping','A category was treated as a lifecycle state','--expected','Preserve the category','--actual','Created a state','--steps','Run discovery then inspect categories']);
  assert.equal(note.recorded,true);
  const report=cli(root,['feedback','export']);
  assert.equal(report.feedback[0].expected,'Preserve the category');
  assert.equal(cli(root,['feedback','export','--metrics-only']).feedback,undefined);
  assert.equal((await new Store(root).read('map')).revision,before.revision);
  await install(root,{dev:false});
  assert.throws(()=>cli(root,['feedback','mapping','Should not record while disabled']),/recording is off/);
});

test('broken diagnostic storage cannot fail map writes or hook context',async()=>{
  const root=await temporary();await install(root);
  const configPath=path.join(root,'.object-map/install.json');
  const config=JSON.parse(await readFile(configPath,'utf8'));
  await writeFile(configPath,JSON.stringify({...config,dev:true}));
  await writeFile(path.join(root,'.object-map/dev'),'Not a directory');
  const store=new Store(root),current=await store.read('map');
  await store.write('map',{...current.data,objects:[makeObject(current.data,'Pizza')]},current.revision);
  const result=JSON.parse(execFileSync(process.execPath,[path.join(root,'.agents/skills/object-map/scripts/hook.mjs')],{cwd:root,input:JSON.stringify({hook_event_name:'SessionStart',cwd:root}),encoding:'utf8'}));
  assert.ok(result.hookSpecificOutput.additionalContext.includes('Pizza'));
});
