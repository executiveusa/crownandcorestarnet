import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { runModel } from './model/index.mjs';
import { parseAgentAnalysis } from './model/protocol.mjs';
import { buildContextBundle } from './lib/context-bundle.mjs';

const root=process.cwd();
const agentsDoc=JSON.parse(fs.readFileSync(path.join(root,'_system','runtime','agents.json'),'utf8'));
const tasksDoc=JSON.parse(fs.readFileSync(path.join(root,'_system','runtime','tasks.json'),'utf8'));
const allAgents=[agentsDoc.manager,...agentsDoc.agents];

const outDir=path.join(root,'outbox','model-proof');
fs.mkdirSync(outDir,{recursive:true});
const results=[];

for(const agent of allAgents){
  const assigned=tasksDoc.tasks.find(x=>x.agent_id===agent.id);
  if(!assigned) throw new Error(`missing task for ${agent.id}`);
  if(!agent.prompt_path) throw new Error(`missing explicit prompt_path for ${agent.id}`);
  const promptPath=path.join(root,...agent.prompt_path.split('/'));
  if(!fs.existsSync(promptPath)) throw new Error(`missing prompt for ${agent.id}`);
  const system=fs.readFileSync(promptPath,'utf8');
  const bundle=buildContextBundle({repoRoot:root,district:agent.district,promptRel:agent.prompt_path});
  if(!bundle.files.length) throw new Error(`empty context bundle for ${agent.id}`);

  const startedAt=new Date().toISOString();
  const modelResult=await runModel({
    agent,
    task:assigned.task,
    system,
    context:bundle.text
  });
  const parsed=parseAgentAnalysis(modelResult.content);
  const verificationTier=(modelResult.external===true&&parsed.valid===true)?'operational':'structural';
  const artifact={
    schema:'cc.model.proof.v2',
    agent_id:agent.id,
    district:agent.district,
    computer_id:agent.computer_id,
    task:assigned.task,
    provider:modelResult.provider,
    model:modelResult.model,
    external:modelResult.external,
    verification_tier:verificationTier,
    business_output_verified:verificationTier==='operational',
    structured_output:parsed.valid,
    structured_error:parsed.error,
    context_sha256:bundle.sha256,
    context_files:bundle.files,
    started_at:startedAt,
    ended_at:new Date().toISOString(),
    response:modelResult.content,
    parsed_analysis:parsed.analysis,
    usage:modelResult.usage
  };
  const raw=JSON.stringify(artifact,null,2)+'\n';
  const sha256=crypto.createHash('sha256').update(raw).digest('hex');
  const file=path.join(outDir,`${agent.id}.json`);
  fs.writeFileSync(file,raw);
  results.push({
    agent_id:agent.id,
    provider:modelResult.provider,
    external:modelResult.external,
    verification_tier:verificationTier,
    business_output_verified:verificationTier==='operational',
    structured_output:parsed.valid,
    context_sha256:bundle.sha256,
    sha256,
    file:path.relative(root,file)
  });
}

const summary={
  schema:'cc.model.proof.summary.v2',
  generated_at:new Date().toISOString(),
  provider:process.env.CC_MODEL_PROVIDER||'fixture',
  agent_count:results.length,
  external_calls:results.filter(x=>x.external).length,
  operationally_verified_agents:results.filter(x=>x.business_output_verified).length,
  structurally_verified_agents:results.filter(x=>!x.business_output_verified).length,
  all_prompt_contracts_loaded:results.length===allAgents.length,
  all_structured_outputs:results.every(x=>x.structured_output===true),
  results
};
fs.writeFileSync(path.join(outDir,'SUMMARY.json'),JSON.stringify(summary,null,2)+'\n');

console.log(`Model seam proof passed: ${results.length}/${allAgents.length} agents loaded scoped context through provider ${summary.provider}.`);
console.log(`Operational agents: ${summary.operationally_verified_agents}; structural-only agents: ${summary.structurally_verified_agents}.`);
if(summary.provider==='fixture') console.log('Fixture proof only: business_output_verified=false for all agents.');
