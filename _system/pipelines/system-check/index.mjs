import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const failures=[];
const required=[
  'CLAUDE.md','CONTEXT.md','docs/PRD.md',
  '_shared/policy/HEART_AND_SOUL.md',
  '_system/policy/rooms.json','_system/policy/permissions.json',
  '_system/integrations/manifest.json','_system/integrations/contracts.json',
  '_system/schedules/schedules.json',
  '_system/runtime/agents.json','_system/runtime/computers.json',
  'districts/middleton/POLICY.md','districts/middleton/canon/system.json'
];
for(const rel of required) if(!fs.existsSync(path.join(root,rel))) failures.push('missing required file: '+rel);

const rooms=JSON.parse(fs.readFileSync(path.join(root,'_system','policy','rooms.json'),'utf8'));
const permissions=JSON.parse(fs.readFileSync(path.join(root,'_system','policy','permissions.json'),'utf8'));
const integrations=JSON.parse(fs.readFileSync(path.join(root,'_system','integrations','manifest.json'),'utf8'));
const schedules=JSON.parse(fs.readFileSync(path.join(root,'_system','schedules','schedules.json'),'utf8'));
const agents=JSON.parse(fs.readFileSync(path.join(root,'_system','runtime','agents.json'),'utf8'));

if((rooms.rooms??[]).length!==7) failures.push('exactly seven Crown & Core business rooms required');
if(permissions.default!=='deny_external_write') failures.push('default permission must deny external writes');
if(permissions.hard_rules?.review_gating!==false) failures.push('review gating must be false');
if((integrations.integrations??[]).some(x=>x.secrets_committed===true)) failures.push('integration manifest reports committed secrets');
if((schedules.jobs??[]).some(x=>x.external_write===true)) failures.push('proof-mode schedules may not perform external writes');

for(const a of [agents.manager,...agents.agents]){
  const prompt=a.prompt_path || `districts/${a.district}/agents/${a.id}/PROMPT.md`;
  if(!fs.existsSync(path.join(root,prompt))) failures.push('missing district-owned prompt: '+prompt);
}

if(failures.length){
  console.error('System check failed');
  failures.forEach(x=>console.error('- '+x));
  process.exit(1);
}
console.log('System check passed.');
console.log('Rooms: 7');
console.log('Default external write: denied');
console.log('Review gating: forbidden');
console.log('Proof schedules: read-only');
console.log('Agent contracts: district-owned');
