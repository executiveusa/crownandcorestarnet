import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root=process.cwd();
const env={PATH:process.env.PATH||''};
const r=spawnSync(process.execPath,['districts/management/stages/01_observe/live-readiness/index.mjs'],{cwd:root,encoding:'utf8',env});
if(r.status!==0){
  console.error(r.stdout,r.stderr);
  process.exit(r.status||1);
}
const data=JSON.parse(fs.readFileSync(path.join(root,'outbox','LIVE-READINESS.json'),'utf8'));
const failures=[];
if(!data.ready.includes('public-web')) failures.push('public-web should be ready without auth');
if(data.ready_to_smoke.length!==0) failures.push('no credential connector should be ready_to_smoke in clean test env');
if(data.next_unlock?.id!=='square') failures.push('Square should be the next unlock');
if(data.secret_values_emitted!==false) failures.push('readiness output must assert no secret values emitted');
const md=fs.readFileSync(path.join(root,'districts','management','output','live-readiness.md'),'utf8');
if(!md.includes('**square**')) failures.push('management output should identify Square as next unlock');

const withToken=spawnSync(process.execPath,['districts/management/stages/01_observe/live-readiness/index.mjs'],{
  cwd:root,encoding:'utf8',env:{...env,CC_SQUARE_ACCESS_TOKEN:'TEST_PRESENCE_ONLY'}
});
if(withToken.status!==0) failures.push('readiness presence test failed with synthetic env presence');
else {
  const next=JSON.parse(fs.readFileSync(path.join(root,'outbox','LIVE-READINESS.json'),'utf8'));
  const square=next.connectors.find(x=>x.id==='square');
  if(square?.readiness!=='READY_TO_SMOKE') failures.push('Square should require authenticated smoke after credential presence');
}

if(failures.length){
  console.error('Live readiness test FAILED');
  failures.forEach(x=>console.error('- '+x));
  process.exit(1);
}
console.log('Live readiness test passed.');
