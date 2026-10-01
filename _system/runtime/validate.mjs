import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const agents=JSON.parse(fs.readFileSync(path.join(root,'_system','runtime','agents.json'),'utf8'));
const computers=JSON.parse(fs.readFileSync(path.join(root,'_system','runtime','computers.json'),'utf8'));
const tasks=JSON.parse(fs.readFileSync(path.join(root,'_system','runtime','tasks.json'),'utf8'));
const scopes=JSON.parse(fs.readFileSync(path.join(root,'_system','runtime','scopes.json'),'utf8'));
const districtRegistry=JSON.parse(fs.readFileSync(path.join(root,'_system','registry','districts.json'),'utf8'));
const failures=[];

const allAgents=[agents.manager,...agents.agents];
const agentIds=allAgents.map(x=>x.id);
const computerIds=allAgents.map(x=>x.computer_id);

if(new Set(agentIds).size!==agentIds.length) failures.push('duplicate agent IDs');
if(new Set(computerIds).size!==computerIds.length) failures.push('computer IDs are not one-to-one with agents');
if(computers.computers.length!==allAgents.length) failures.push('computer count must equal agent count');
if(tasks.tasks.length!==allAgents.length) failures.push('task assignment count must equal agent count');
if(new Set(tasks.tasks.map(x=>x.agent_id)).size!==tasks.tasks.length) failures.push('duplicate task agent assignments');
if(computers.proof_backend!=='docker') failures.push('docker must be the proof backend');
if(computers.isolation_authority!=='runtime:prove:docker') failures.push('docker isolation authority not declared');
if(computers.operational_backend!=='docker-operational') failures.push('docker-operational must be declared as operational backend');
if(!fs.existsSync(path.join(root,'_system','runtime','backends','docker-operational.mjs'))) failures.push('missing docker-operational backend');
if(!fs.existsSync(path.join(root,'_system','runtime','model-gateway','server.mjs'))) failures.push('missing model gateway');

for(const agent of allAgents){
  if(!tasks.tasks.some(x=>x.agent_id===agent.id)) failures.push(`missing task assignment for ${agent.id}`);
  const promptPath=path.join(root,...(agent.prompt_path || `districts/${agent.district}/agents/${agent.id}/PROMPT.md`).split('/'));
  if(!fs.existsSync(promptPath)) failures.push(`missing prompt contract for ${agent.id}`);
  if(!agent.output_path) failures.push(`missing output_path for ${agent.id}`);
  else if(!agent.output_path.startsWith(`districts/${agent.district}/output/`)) failures.push(`output_path escapes district output for ${agent.id}`);
  const computer=computers.computers.find(x=>x.id===agent.computer_id);
  if(!computer) failures.push(`missing computer for ${agent.id}`);
  else {
    if(computer.agent_id!==agent.id) failures.push(`computer owner mismatch for ${agent.id}`);
    if(computer.district!==agent.district) failures.push(`district mismatch for ${agent.id}`);
  }
}

const districts=[...new Set(agents.agents.map(x=>x.district))];
if(scopes.version!==3) failures.push('runtime scopes must use per-agent schema version 3');
if(scopes.districts) failures.push('district-wide runtime scopes are forbidden; use explicit per-agent scopes');
for(const agent of allAgents){
  const s=scopes.agents?.[agent.id];
  if(!s) { failures.push(`missing explicit scope for agent: ${agent.id}`); continue; }
  const reads=s.read||[];
  if(reads.length>5) failures.push(`agent scope exceeds 5 explicit reads: ${agent.id}`);
  if(!reads.includes(`districts/${agent.district}/CONTEXT.md`)) failures.push(`agent scope missing own district CONTEXT: ${agent.id}`);
  for(const rel of reads){
    if(path.isAbsolute(rel)||rel.split(/[\\/]+/).includes('..')) failures.push(`unsafe scope path for ${agent.id}: ${rel}`);
    if(rel==='.'||rel==='/'||rel==='districts'||rel==='_shared'||rel==='_system') failures.push(`overbroad scope path for ${agent.id}: ${rel}`);
    if(rel.includes('/agents/') && rel!==agent.prompt_path) failures.push(`agent scope attempts to read another agent contract: ${agent.id} -> ${rel}`);
  }
}
for(const rel of (scopes.shared_read||[])){
  if(path.isAbsolute(rel)||rel.split(/[\\/]+/).includes('..')) failures.push(`unsafe shared scope path: ${rel}`);
  if(!rel.startsWith('_shared/')) failures.push(`shared scope must live under _shared: ${rel}`);
}
for(const district of ['management',...districts]){
  const d=districtRegistry.districts?.find(x=>x.id===district);
  if(!d){ failures.push(`missing canonical district registry entry: ${district}`); continue; }
  if(d.isolated!==true) failures.push(`district not isolated: ${district}`);
  const expected=(district==='management' ? [agents.manager.id] : agents.agents.filter(x=>x.district===district).map(x=>x.id)).sort();
  const actual=[...(d.agents||[])].sort();
  if(JSON.stringify(expected)!==JSON.stringify(actual)) failures.push(`district agent roster mismatch: ${district}`);
  if(d.external_writes!==false) failures.push(`proof-mode district allows external writes: ${district}`);
  if(d.context!==`districts/${district}/CONTEXT.md`) failures.push(`district context registry mismatch: ${district}`);
}

if(failures.length){
  console.error('Runtime topology validation FAILED');
  failures.forEach(x=>console.error('- '+x));
  process.exit(1);
}
console.log(`Runtime topology validation passed: ${allAgents.length} agents, ${computers.computers.length} computers, ${districts.length} districts, ${tasks.tasks.length} assigned tasks.`);
