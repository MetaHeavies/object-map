import {readFile, mkdir, appendFile, open} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import path from 'node:path';

export async function devConfig(root) {
  try { return JSON.parse(await readFile(path.join(root,'.object-map/install.json'),'utf8')); }
  catch { return {}; }
}
const eventTypes = new Set(['installed','hook','hook_error','review','write','write_error']);
const phases = new Set(['SessionStart','UserPromptSubmit','Stop']);
const outcomes = new Set(['context','reminded','reviewed','continued','missing_prompt','updated','unchanged','success','conflict','invalid','busy','error']);
const counts = ['objects','attributes','relationships','actions','states'];
export function mapCounts(map) {
  return Object.fromEntries([['objects',map.objects.length], ...counts.slice(1).map(section=>[section,map.objects.reduce((total,object)=>total+object[section].length,0)])]);
}
// Callers cannot accidentally put prompts, names, paths or arbitrary error text in automatic events.
export async function recordEvent(root, type, details = {}) {
  try {
    const config = await devConfig(root);
    if (!config.dev || !eventTypes.has(type)) return;
    const data = {};
    if (phases.has(details.phase)) data.phase=details.phase;
    if (outcomes.has(details.outcome)) data.outcome=details.outcome;
    if (['map','layout'].includes(details.document)) data.document=details.document;
    if (/^[a-f0-9]{32}$/.test(details.turn || '')) data.turn=details.turn;
    for (const key of [...counts,'durationMs']) if (Number.isFinite(details[key]) && details[key]>=0) data[key]=Math.round(details[key]);
    await append(root,'events',{schema:1,at:new Date().toISOString(),build:config.build || 'unversioned',type,...data});
  } catch { /* Diagnostics must never make a map save or host hook fail. */ }
}
async function append(root, kind, value) {
  const directory=path.join(root,'.object-map/dev');
  await mkdir(directory,{recursive:true});
  await appendFile(path.join(directory,`${kind}.jsonl`),JSON.stringify(value)+'\n');
}
async function tail(root, kind, limit) {
  let file;
  try { file=await open(path.join(root,'.object-map/dev',`${kind}.jsonl`),'r'); }
  catch(error){if(error.code==='ENOENT')return {entries:[],truncated:false,invalidLines:0};throw error;}
  try {
    const {size}=await file.stat(), start=Math.max(0,size-2*1024*1024);
    const buffer=Buffer.alloc(size-start);
    const {bytesRead}=await file.read(buffer,0,buffer.length,start);
    let content=buffer.subarray(0,bytesRead).toString('utf8');
    if(start)content=content.slice(content.indexOf('\n')+1);
    let invalidLines=0;
    const entries=content.split('\n').filter(Boolean).flatMap(line=>{try{return [JSON.parse(line)];}catch{invalidLines++;return [];}});
    return {entries:entries.slice(-limit),truncated:start>0 || entries.length>limit,invalidLines};
  } finally {await file.close();}
}
const categories=new Set(['mapping','workflow','hooks','canvas','installation','other']);
export async function addFeedback(root, category, summary, fields={}) {
  const config=await devConfig(root);
  if (!config.dev) throw new Error('Feedback recording is off. Reinstall with --dev to enable local feedback.');
  if (!categories.has(category)) throw new Error('Feedback category: mapping, workflow, hooks, canvas, installation, other');
  if (typeof summary!=='string' || !summary.trim() || summary.length>2000) throw new Error('Feedback needs a summary of 1–2000 characters.');
  const note={schema:1,id:randomUUID(),at:new Date().toISOString(),build:config.build || 'unversioned',category,summary:summary.trim()};
  for(const key of ['expected','actual','steps']) if(fields[key]) {
    if(typeof fields[key]!=='string'||fields[key].length>4000) throw new Error(`${key} must be at most 4000 characters`);
    note[key]=fields[key];
  }
  await append(root,'feedback',note);
  return {recorded:true,id:note.id};
}
export async function exportFeedback(root, {metricsOnly=false}={}) {
  const config=await devConfig(root);
  const events=await tail(root,'events',2000), notes=await tail(root,'feedback',100);
  const totals={};
  for(const event of events.entries){const key=[event.type,event.phase,event.outcome].filter(Boolean).join('.');totals[key]=(totals[key]||0)+1;}
  return {schema:1,generatedAt:new Date().toISOString(),devEnabled:!!config.dev,installedBuild:config.build || 'unversioned',
    environment:{node:process.version,platform:process.platform,arch:process.arch},
    coverage:{events:events.entries.length,notes:notes.entries.length,truncated:events.truncated||notes.truncated,invalidLines:events.invalidLines+notes.invalidLines},
    totals,events:events.entries,...(!metricsOnly?{feedback:notes.entries}:{}),
    note:metricsOnly?'Automatic diagnostics only; no qualitative notes included.':'Automatic diagnostics exclude code, prompts, object names and repository paths. Qualitative notes contain supplied text; review them before sharing. No report is sent automatically.'};
}
