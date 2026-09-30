import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root=process.cwd();
const r=spawnSync(process.execPath,['workflows/data-readiness/index.mjs'],{cwd:root,encoding:'utf8',env:{PATH:process.env.PATH||''}});
if(r.status!==0){
  console.error(r.stdout,r.stderr);
  process.exit(r.status||1);
}
const data=JSON.parse(fs.readFileSync(path.join(root,'outbox','DATA-READINESS.json'),'utf8'));
const failures=[];

if(!data.ready.includes('public-web')) failures.push('public-web should be ready without auth');
for(const id of ['square','meta','google-business','analytics','perspective','riverside']){
  const c=data.connectors.find(x=>x.id===id);
  if(!c) failures.push(`missing connector ${id}`);
  else if(c.readiness==='READY') failures.push(`${id} unexpectedly ready without auth`);
}
for(const id of ['communications','media-storage']){
  const c=data.connectors.find(x=>x.id===id);
  if(!c || c.readiness!=='BLOCKED_PROVIDER_TBD') failures.push(`${id} should be provider-TBD`);
}
if(failures.length){
  console.error('Data readiness test failed');
  failures.forEach(x=>console.error('- '+x));
  process.exit(1);
}
console.log('Data readiness fail-closed test passed.');
