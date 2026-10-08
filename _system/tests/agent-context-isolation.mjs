import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { materializeAgentInput } from '../runtime/lib/materialize-input.mjs';

const root=process.cwd();
const registry=JSON.parse(fs.readFileSync(path.join(root,'_system','runtime','agents.json'),'utf8'));
const scopes=JSON.parse(fs.readFileSync(path.join(root,'_system','runtime','scopes.json'),'utf8'));
const agents=[registry.manager,...registry.agents];
const failures=[];

for(const agent of agents){
  const computerRoot=fs.mkdtempSync(path.join(os.tmpdir(),`cc-scope-${agent.id}-`));
  try{
    const result=materializeAgentInput({repoRoot:root,computerRoot,agent});
    const manifest=result.manifest;
    const filePaths=manifest.files.map(x=>x.path);

    if(manifest.agent_id!==agent.id) failures.push(`${agent.id}: manifest agent mismatch`);
    if(manifest.district!==agent.district) failures.push(`${agent.id}: manifest district mismatch`);
    if(manifest.scope_version!==3) failures.push(`${agent.id}: manifest scope version mismatch`);
    if(!filePaths.includes(agent.prompt_path)) failures.push(`${agent.id}: own prompt missing`);

    const otherPrompts=agents
      .filter(x=>x.id!==agent.id)
      .map(x=>x.prompt_path)
      .filter(p=>filePaths.includes(p));
    if(otherPrompts.length) failures.push(`${agent.id}: received foreign prompts: ${otherPrompts.join(', ')}`);

    const foreignContexts=filePaths
      .filter(p=>/^districts\/[^/]+\/CONTEXT\.md$/.test(p))
      .filter(p=>p!==`districts/${agent.district}/CONTEXT.md`);
    if(foreignContexts.length) failures.push(`${agent.id}: received foreign district context: ${foreignContexts.join(', ')}`);

    const explicit=(scopes.agents?.[agent.id]?.read||[]);
    if(explicit.length>5) failures.push(`${agent.id}: explicit context budget > 5`);
    const expectedMax=(scopes.shared_read||[]).length+explicit.length+1;
    if(manifest.explicit_paths.length!==expectedMax) failures.push(`${agent.id}: unexpected explicit path count`);

    const inputRoot=result.bundleRoot;
    if(fs.existsSync(path.join(inputRoot,'.git'))) failures.push(`${agent.id}: full repository metadata visible`);
    if(fs.existsSync(path.join(inputRoot,'package.json'))) failures.push(`${agent.id}: root package.json visible`);
  } finally {
    fs.rmSync(computerRoot,{recursive:true,force:true});
  }
}

if(failures.length){
  console.error('Per-agent context isolation test FAILED');
  failures.forEach(x=>console.error('- '+x));
  process.exit(1);
}

console.log(`Per-agent context isolation passed for ${agents.length} agents.`);
console.log('No foreign agent prompts or district CONTEXT files were materialized.');
console.log('Every explicit agent scope stays within the 5-path task budget.');
