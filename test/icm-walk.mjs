import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const failures=[];
const districts=['management','conversion','return','trust','nurture','reception','media','performance','middleton'];

function exists(rel){ return fs.existsSync(path.join(root,rel)); }
function lines(rel){ return fs.readFileSync(path.join(root,rel),'utf8').split(/\r?\n/).length; }

for(const rel of ['CLAUDE.md','CONTEXT.md','_system/CONTEXT.md','_shared/CONTEXT.md','docs/icm/MIGRATION_MAP.md']){
  if(!exists(rel)) failures.push('missing ICM root file: '+rel);
}
if(exists('CLAUDE.md') && lines('CLAUDE.md')>60) failures.push('root CLAUDE.md exceeds ~60-line routing target');

for(const d of districts){
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
for(const d of districts){
  if(!scopes.districts?.[d]) failures.push('missing runtime ICM scope: '+d);
  if(!(scopes.districts?.[d]?.read||[]).includes(`districts/${d}/CONTEXT.md`)) failures.push('scope missing own CONTEXT: '+d);
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
