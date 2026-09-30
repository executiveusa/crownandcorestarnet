import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { runModel } from './model/index.mjs';

const root=process.cwd();
const agentsDoc=JSON.parse(fs.readFileSync(path.join(root,'_system','runtime','agents.json'),'utf8'));
const tasksDoc=JSON.parse(fs.readFileSync(path.join(root,'_system','runtime','tasks.json'),'utf8'));
const allAgents=[agentsDoc.manager,...agentsDoc.agents];

const sharedContext=[
  fs.readFileSync(path.join(root,'_shared','client','FACTS.md'),'utf8'),
  fs.readFileSync(path.join(root,'_shared','client','PUBLIC_TRUTH.md'),'utf8'),
  fs.readFileSync(path.join(root,'_shared','policy','HEART_AND_SOUL.md'),'utf8')
].join('\n\n---\n\n');

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
  const startedAt=new Date().toISOString();
  const modelResult=await runModel({
    agent,
    task:assigned.task,
    system,
    context:sharedContext
  });
  const artifact={
    schema:'cc.model.proof.v1',
    agent_id:agent.id,
    district:agent.district,
    computer_id:agent.computer_id,
    task:assigned.task,
    provider:modelResult.provider,
    model:modelResult.model,
    external:modelResult.external,
    started_at:startedAt,
    ended_at:new Date().toISOString(),
    response:modelResult.content,
    usage:modelResult.usage
  };
  const raw=JSON.stringify(artifact,null,2)+'\n';
  const sha256=crypto.createHash('sha256').update(raw).digest('hex');
  const file=path.join(outDir,`${agent.id}.json`);
  fs.writeFileSync(file,raw);
  results.push({agent_id:agent.id,provider:modelResult.provider,external:modelResult.external,sha256,file:path.relative(root,file)});
}

const summary={
  schema:'cc.model.proof.summary.v1',
  generated_at:new Date().toISOString(),
  provider:process.env.CC_MODEL_PROVIDER||'fixture',
  agent_count:results.length,
  external_calls:results.filter(x=>x.external).length,
  all_prompt_contracts_loaded:results.length===allAgents.length,
  results
};
fs.writeFileSync(path.join(outDir,'SUMMARY.json'),JSON.stringify(summary,null,2)+'\n');

console.log(`Model seam proof passed: ${results.length}/${allAgents.length} agents loaded prompt + task + context through provider ${summary.provider}.`);
if(summary.provider==='fixture') console.log('Fixture proof only: this does not claim a live external LLM was called.');
