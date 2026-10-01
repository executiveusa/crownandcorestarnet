import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const failures=[];
const districts=['management','conversion','return','trust','nurture','reception','media','performance','middleton'];

function exists(rel){ return fs.existsSync(path.join(root,rel)); }
function lines(rel){ return fs.readFileSync(path.join(root,rel),'utf8').split(/\r?\n/).length; }

for(const rel of ['CLAUDE.md','CONTEXT.md','_system/CONTEXT.md','_shared/CONTEXT.md','_system/method/MIGRATION_MAP.md','_system/method/ICM_ARCHITECTURE.md']){
  if(!exists(rel)) failures.push('missing ICM root file: '+rel);
}
if(exists('CLAUDE.md') && lines('CLAUDE.md')>60) failures.push('root CLAUDE.md exceeds ~60-line routing target');

const forbiddenLegacy=[
  'runtime','config','integrations','schemas','schedules','test','workflows',
  'agents','client','data','lib','registry','scripts',
  'HEART_AND_SOUL.md','UPSTREAM.md','docs'
];
for(const rel of forbiddenLegacy){
  if(exists(rel)) failures.push('legacy duplicate remains outside ICM home: '+rel);
}

for(const rel of [
  '_system/method/ICM_ARCHITECTURE.md',
  '_system/registry/districts.yaml',
  '_system/registry/districts.json',
  '_system/references/UPSTREAM.md',
  '_system/templates/CLAUDE.md',
  '_system/templates/CONTEXT.md',
  '_system/scripts/bootstrap-upstream.sh',
  '_system/scripts/bootstrap-upstream.ps1',
  '_system/schedules/schedules.json',
  '_system/schemas/action-request.example.json'
]){
  if(!exists(rel)) failures.push('missing canonical system factory file: '+rel);
}

for(const d of districts){
  if(exists(`districts/${d}/district.json`)) failures.push(`legacy district.json remains in ${d}`);
  for(const rel of [`districts/${d}/CLAUDE.md`,`districts/${d}/CONTEXT.md`,`districts/${d}/output/.gitkeep`]){
    if(!exists(rel)) failures.push('missing district ICM surface: '+rel);
  }
}

const registry=JSON.parse(fs.readFileSync(path.join(root,'_system','runtime','agents.json'),'utf8'));
const agents=[registry.manager,...registry.agents];
for(const a of agents){
  const expected=`districts/${a.district}/agents/${a.id}/PROMPT.md`;
  if(a.prompt_path!==expected) failures.push(`agent prompt_path mismatch for ${a.id}`);
  if(!exists(expected)) failures.push(`missing district-owned agent prompt: ${expected}`);
}

const scopes=JSON.parse(fs.readFileSync(path.join(root,'_system','runtime','scopes.json'),'utf8'));
if(scopes.version!==3) failures.push('ICM scopes must use explicit per-agent schema v3');
if(scopes.districts) failures.push('district-wide runtime scopes remain; per-agent scopes are required');
for(const a of agents){
  const s=scopes.agents?.[a.id];
  if(!s){ failures.push('missing runtime ICM agent scope: '+a.id); continue; }
  const reads=s.read||[];
  if(!reads.includes(`districts/${a.district}/CONTEXT.md`)) failures.push('agent scope missing own CONTEXT: '+a.id);
  if(reads.length>5) failures.push('agent context budget exceeded: '+a.id);
}
for(const rel of scopes.shared_read||[]){
  if(!rel.startsWith('_shared/')) failures.push('shared runtime input outside _shared: '+rel);
}

if(failures.length){
  console.error('ICM walk/invariant check FAILED');
  failures.forEach(x=>console.error('- '+x));
  process.exit(1);
}

console.log('ICM walk/invariant check passed.');
console.log('Root router <= 60 lines.');
console.log('District contracts: '+districts.length);
console.log('District-owned agent prompts: '+agents.length);
console.log('Runtime shared inputs route through _shared.');
console.log('Every agent has an explicit <=5-file task scope plus shared truth and its own prompt.');
console.log('No forbidden legacy root copies remain.');
