import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { launchLocalProcess } from './backends/local-process.mjs';
import { launchDockerComputer } from './backends/docker.mjs';
import { verifyReceipt } from './lib/receipt.mjs';

const repoRoot=process.cwd();
const agentsDoc=JSON.parse(fs.readFileSync(path.join(repoRoot,'runtime','agents.json'),'utf8'));
const computersDoc=JSON.parse(fs.readFileSync(path.join(repoRoot,'runtime','computers.json'),'utf8'));
const tasksDoc=JSON.parse(fs.readFileSync(path.join(repoRoot,'runtime','tasks.json'),'utf8'));

const args=Object.fromEntries(process.argv.slice(2).map(x=>{
  const i=x.indexOf('=');
  return i>0?[x.slice(2,i),x.slice(i+1)]:[x.replace(/^--/,''),'true'];
}));
const missionFile=args.mission || path.join(repoRoot,'runtime','missions','proof-all.json');
const mission=JSON.parse(fs.readFileSync(missionFile,'utf8'));
const backend=args.backend || mission.backend || 'local-process';
if(!['local-process','docker'].includes(backend)) throw new Error(`unsupported mission backend: ${backend}`);
const launchComputer=backend==='docker' ? launchDockerComputer : launchLocalProcess;

const allAgents=[agentsDoc.manager,...agentsDoc.agents];
const wanted=mission.agent_ids?.length?mission.agent_ids:allAgents.map(x=>x.id);
const selected=wanted.map(id=>{
  const agent=allAgents.find(x=>x.id===id);
  if(!agent) throw new Error(`mission references unknown agent: ${id}`);
  const computer=computersDoc.computers.find(x=>x.id===agent.computer_id);
  const assigned=tasksDoc.tasks.find(x=>x.agent_id===id);
  if(!computer||!assigned) throw new Error(`incomplete registry for ${id}`);
  return {agent,computer,task:assigned.task};
});

const missionId=mission.id || `mission-${Date.now()}`;
const jobsDir=path.join(repoRoot,'.runtime','missions',missionId);
fs.mkdirSync(jobsDir,{recursive:true});
const startedAt=new Date().toISOString();

const runResults=await Promise.all(selected.map(async (x,index)=>{
  const runId=`${missionId}-${String(index+1).padStart(2,'0')}-${x.agent.id}`;
  const job={
    id:runId,mission_id:missionId,agent_id:x.agent.id,district:x.agent.district,
    computer_id:x.computer.id,task:x.task,status:'RUNNING',started_at:new Date().toISOString()
  };
  fs.writeFileSync(path.join(jobsDir,`${runId}.job.json`),JSON.stringify(job,null,2)+'\n');
  try{
    const receipt=await launchComputer({repoRoot,agent:x.agent,computer:x.computer,task:x.task,runId});
    const verification=verifyReceipt({receipt,repoRoot,agentsDoc,computersDoc,tasksDoc});
    const final={...job,status:verification.verified?'VERIFIED':'FAILED_PROOF',ended_at:new Date().toISOString(),receipt,verification};
    fs.writeFileSync(path.join(jobsDir,`${runId}.job.json`),JSON.stringify(final,null,2)+'\n');
    return final;
  }catch(e){
    const final={...job,status:'FAILED_RUN',ended_at:new Date().toISOString(),error:String(e?.message||e)};
    fs.writeFileSync(path.join(jobsDir,`${runId}.job.json`),JSON.stringify(final,null,2)+'\n');
    return final;
  }
}));

const failures=runResults.filter(x=>x.status!=='VERIFIED');
const summary={
  schema:'cc.mission.receipt.v1',
  mission_id:missionId,
  purpose:mission.purpose||null,
  backend,
  started_at:startedAt,
  ended_at:new Date().toISOString(),
  requested_agents:wanted.length,
  verified_jobs:runResults.filter(x=>x.status==='VERIFIED').length,
  failed_jobs:failures.length,
  status:failures.length?'FAILED':'VERIFIED',
  jobs:runResults.map(x=>({id:x.id,agent_id:x.agent_id,district:x.district,computer_id:x.computer_id,task:x.task,status:x.status}))
};
const raw=JSON.stringify(summary,null,2)+'\n';
summary.sha256=crypto.createHash('sha256').update(raw).digest('hex');
fs.writeFileSync(path.join(jobsDir,'MISSION-RECEIPT.json'),JSON.stringify(summary,null,2)+'\n');

console.log(`${summary.status}: ${summary.mission_id} — ${summary.verified_jobs}/${summary.requested_agents} jobs verified`);
if(failures.length){
  failures.forEach(x=>console.error(`- ${x.agent_id}: ${x.status}`));
  process.exit(1);
}
