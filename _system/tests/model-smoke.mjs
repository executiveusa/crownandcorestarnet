import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root=process.cwd();
const env={PATH:process.env.PATH||'',CC_MODEL_PROVIDER:'fixture'};
const r=spawnSync(process.execPath,['_system/runtime/model-smoke.mjs'],{cwd:root,encoding:'utf8',env});
if(r.status!==0){
  console.error(r.stdout,r.stderr);
  process.exit(r.status||1);
}
const summary=JSON.parse(fs.readFileSync(path.join(root,'outbox','model-proof','SUMMARY.json'),'utf8'));
const agents=JSON.parse(fs.readFileSync(path.join(root,'_system','runtime','agents.json'),'utf8'));
const expected=1+agents.agents.length;
const failures=[];
if(summary.agent_count!==expected) failures.push(`expected ${expected} agents, got ${summary.agent_count}`);
if(summary.provider!=='fixture') failures.push('CI model proof must use fixture');
if(summary.external_calls!==0) failures.push('fixture proof made external calls');
if(summary.all_prompt_contracts_loaded!==true) failures.push('not all prompt contracts loaded');
if(summary.all_structured_outputs!==true) failures.push('fixture outputs did not satisfy structured agent protocol');
if(summary.operationally_verified_agents!==0) failures.push('fixture run must not claim operational business verification');
if(summary.structurally_verified_agents!==expected) failures.push('all fixture agents should be structural-only');
for(const result of summary.results||[]){
  if(!/^[a-f0-9]{64}$/.test(result.sha256||'')) failures.push(`bad artifact hash for ${result.agent_id}`);
  if(!/^[a-f0-9]{64}$/.test(result.context_sha256||'')) failures.push(`bad context hash for ${result.agent_id}`);
  if(result.business_output_verified!==false) failures.push(`fixture agent ${result.agent_id} falsely marked business output verified`);
}
if(failures.length){
  console.error('Model seam test failed');
  failures.forEach(x=>console.error('- '+x));
  process.exit(1);
}
console.log('All-agent scoped-context fixture test passed; operational claims remain false.');
