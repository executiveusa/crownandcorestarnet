import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const agents=JSON.parse(fs.readFileSync(path.join(root,'runtime','agents.json'),'utf8'));
const computers=JSON.parse(fs.readFileSync(path.join(root,'runtime','computers.json'),'utf8'));
const tasks=JSON.parse(fs.readFileSync(path.join(root,'runtime','tasks.json'),'utf8'));
const failures=[];

const allAgents=[agents.manager,...agents.agents];
const agentIds=allAgents.map(x=>x.id);
const computerIds=allAgents.map(x=>x.computer_id);

if(new Set(agentIds).size!==agentIds.length) failures.push('duplicate agent IDs');
if(new Set(computerIds).size!==computerIds.length) failures.push('computer IDs are not one-to-one with agents');
if(computers.computers.length!==allAgents.length) failures.push('computer count must equal agent count');
if(tasks.tasks.length!==allAgents.length) failures.push('task assignment count must equal agent count');
if(new Set(tasks.tasks.map(x=>x.agent_id)).size!==tasks.tasks.length) failures.push('duplicate task agent assignments');

for(const agent of allAgents){
  if(!tasks.tasks.some(x=>x.agent_id===agent.id)) failures.push(`missing task assignment for ${agent.id}`);
  const promptPath=path.join(root,'agents','workers',agent.id,'PROMPT.md');
  if(!fs.existsSync(promptPath)) failures.push(`missing prompt contract for ${agent.id}`);
  const computer=computers.computers.find(x=>x.id===agent.computer_id);
  if(!computer) failures.push(`missing computer for ${agent.id}`);
  else {
    if(computer.agent_id!==agent.id) failures.push(`computer owner mismatch for ${agent.id}`);
    if(computer.district!==agent.district) failures.push(`district mismatch for ${agent.id}`);
  }
}

const districts=[...new Set(agents.agents.map(x=>x.district))];
for(const district of districts){
  const districtPath=path.join(root,'districts',district,'district.json');
  if(!fs.existsSync(districtPath)){ failures.push(`missing district manifest: ${district}`); continue; }
  const d=JSON.parse(fs.readFileSync(districtPath,'utf8'));
  if(d.isolated!==true) failures.push(`district not isolated: ${district}`);
  const expected=agents.agents.filter(x=>x.district===district).map(x=>x.id).sort();
  const actual=[...(d.agents||[])].sort();
  if(JSON.stringify(expected)!==JSON.stringify(actual)) failures.push(`district agent roster mismatch: ${district}`);
  if(d.external_writes!==false) failures.push(`proof-mode district allows external writes: ${district}`);
}

if(failures.length){
  console.error('Runtime topology validation FAILED');
  failures.forEach(x=>console.error('- '+x));
  process.exit(1);
}
console.log(`Runtime topology validation passed: ${allAgents.length} agents, ${computers.computers.length} computers, ${districts.length} districts, ${tasks.tasks.length} assigned tasks.`);
