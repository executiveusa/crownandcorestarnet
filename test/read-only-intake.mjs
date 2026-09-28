import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root=process.cwd();
const baselineBefore=fs.readFileSync(path.join(root,'data','current-state.json'),'utf8');
const r=spawnSync(process.execPath,['workflows/read-only-intake/index.mjs','--mode=fixture'],{cwd:root,encoding:'utf8'});
if(r.status!==0){ console.error(r.stdout,r.stderr); process.exit(r.status||1); }

const baselineAfter=fs.readFileSync(path.join(root,'data','current-state.json'),'utf8');
const proof=JSON.parse(fs.readFileSync(path.join(root,'outbox','READ-ONLY-INTAKE-PROOF.json'),'utf8'));
const failures=[];
if(baselineBefore!==baselineAfter) failures.push('fixture intake mutated verified current-state');
if(proof.applied!==false) failures.push('fixture proof claims applied');
if(proof.candidate_state?.provenance?.synthetic!==true) failures.push('fixture candidate lacks synthetic provenance');
if(proof.snapshots?.length!==4) failures.push('expected four fixture snapshots');
const square=proof.snapshots.find(x=>x.connector==='square');
if(square?.metrics?.monthly_attributable_revenue!==null) failures.push('Square gross revenue was incorrectly labeled attributable');
if(square?.observed?.monthly_gross_order_total!==325) failures.push('Square fixture gross total normalization wrong');

const blocked=spawnSync(process.execPath,['workflows/read-only-intake/index.mjs','--mode=fixture','--apply=true'],{cwd:root,encoding:'utf8'});
if(blocked.status===0) failures.push('synthetic fixture was allowed to apply');

const liveNoAuth=spawnSync(process.execPath,['integrations/live-square-smoke.mjs'],{cwd:root,encoding:'utf8',env:{PATH:process.env.PATH||''}});
if(liveNoAuth.status!==3) failures.push(`Square live smoke should block with code 3 without auth, got ${liveNoAuth.status}`);

if(failures.length){
  console.error('Read-only intake tests failed');
  failures.forEach(x=>console.error('- '+x));
  process.exit(1);
}
console.log('Read-only intake proof passed; synthetic data cannot mutate verified state; Square live mode fails closed without auth.');
