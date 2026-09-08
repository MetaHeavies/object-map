import assert from 'node:assert/strict';
import {mkdtemp, mkdir, writeFile, readFile} from 'node:fs/promises';
import {execFileSync, spawn} from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
const temporary = await mkdtemp(path.join(os.tmpdir(),'object-map-portable-'));
execFileSync('tar',['-xzf',path.resolve('dist/object-map-skill.tgz'),'-C',temporary]);
const product=path.join(temporary,'kitchen');
await mkdir(product);
await writeFile(path.join(product,'PRD.md'),'Customers can configure a Pizza with size and toppings.\n');
const installer=path.join(temporary,'object-map/scripts/install.mjs');
execFileSync(process.execPath,[installer,product],{encoding:'utf8'});
const script=path.join(product,'.agents/skills/object-map/scripts/map.mjs');
const run=args=>JSON.parse(execFileSync(process.execPath,[script,...args],{cwd:product,encoding:'utf8'}));
const snapshot=run(['read']);
assert.equal(snapshot.data.objects.length,0,'Installing never seeds a map into another product');
const map={version:1,objects:[{id:'obj:pizza',name:'Pizza',description:'A pizza a customer can configure.',status:'intended',attributes:[{id:'obj:pizza/attr:size',name:'Size',status:'intended'}],relationships:[],actions:[],states:[],evidence:['PRD.md']}]};
const candidate=path.join(temporary,'candidate.json');
await writeFile(candidate,JSON.stringify(map));
run(['write',candidate,'--revision',snapshot.revision]);
const doctor=run(['doctor']);
assert.ok(doctor.checks.find(check=>check.file.endsWith('assets/app/index.html')).present);
const server=spawn(process.execPath,[path.join(product,'.agents/skills/object-map/scripts/serve.mjs'),'--port=0'],{cwd:product,stdio:['ignore','pipe','pipe']});
let output='', errors='';
server.stdout.on('data',chunk=>output+=chunk);
server.stderr.on('data',chunk=>errors+=chunk);
try {
  let address;
  for(let i=0;i<100;i++){
    address=output.match(/http:\/\/127\.0\.0\.1:\d+/)?.[0];
    if(address)break;
    if(server.exitCode!==null)throw new Error(errors||'Portable server exited');
    await new Promise(resolve=>setTimeout(resolve,50));
  }
  assert.ok(address,errors||'Portable server failed to start');
  const html=await (await fetch(address)).text();
  const asset=html.match(/src="([^"]+\.js)"/)?.[1];
  assert.ok(asset,'Packaged canvas references a built script');
  assert.equal((await fetch(address+asset)).status,200);
  const workspace=await (await fetch(address+'/api/workspace')).json();
  assert.deepEqual(workspace.map,map);
  assert.equal(workspace.config.name,'kitchen');
  assert.ok((await readFile(path.join(product,'AGENTS.md'),'utf8')).includes('Object Map'));
  console.log('Portable bundle passed: extracted skill installs into a new product, writes Pizza, serves the bundled canvas and its own map without project dependencies.');
} finally {server.kill();}
