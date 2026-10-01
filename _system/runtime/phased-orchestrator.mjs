import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { launchLocalProcess } from './backends/local-process.mjs';
import { launchDockerComputer } from './backends/docker.mjs';
import { launchDockerOperationalComputer } from './backends/docker-operational.mjs';
import { verifyReceipt } from './lib/receipt.mjs';
import { publishOperationalOutput } from './lib/publish-output.mjs';

const repoRoot=process.cwd();
const args=Object.fromEntries(process.argv.slice(2).map(x=>{
  const i=x.indexOf('=');
  return i>0?[x.slice(2,i),x.slice(i+1)]:[x.replace(/^--/,''),'true'];
}));

const missionFile=args.mission || path.join(repoRoot,'_system','runtime','missions','phased-proof.json');
const mission=JSON.parse(fs.readFileSync(missionFile,'utf8'));
const backend=args.backend || mission.backend || 'docker';
if(!['local-process','docker','docker-operational'].includes(backend)) throw new Error('unsupported phased backend: '+backend);

const launchComputer=backend==='docker'
  ? launchDockerComputer
  : backend==='docker-operational'
    ? launchDockerOperationalComputer
    : launchLocalProcess;

const agentsDoc=JSON.parse(fs.readFileSync(path.join(repoRoot,'_system','runtime','agents.json'),'utf8'));
const computersDoc=JSON.parse(fs.readFileSync(path.join(repoRoot,'_system','runtime','computers.json'),'utf8'));
const tasksDoc=JSON.parse(fs.readFileSync(path.join(repoRoot,'_system','runtime','tasks.json'),'utf8'));
const allAgents=[agentsDoc.manager,...agentsDoc.agents];
const byId=new Map(allAgents.map(x=>[x.id,x]));

const missionId=mission.id || ('phased-'+Date.now());
const missionDir=path.join(repoRoot,'.runtime','missions',missionId);
const handoffDir=path.join(repoRoot,'.runtime','handoffs',missionId);
fs.mkdirSync(missionDir,{recursive:true});
fs.mkdirSync(handoffDir,{recursive:true});
const startedAt=new Date().toISOString();
const allResults=[];
const phaseReceipts=[];

function hashJson(value){
  const raw=JSON.stringify(value,null,2)+'\n';
  return {raw,sha256:crypto.createHash('sha256').update(raw).digest('hex')};
}

function resolveAgent(id){
  const agent=byId.get(id);
  if(!agent) throw new Error('unknown phased mission agent: '+id);
  const computer=computersDoc.computers.find(x=>x.id===agent.computer_id);
  const assigned=tasksDoc.tasks.find(x=>x.agent_id===id);
  if(!computer||!assigned) throw new Error('incomplete registry for '+id);
  return {agent,computer,task:assigned.task};
}

function writeHandoff(phaseName,results,upstreamPhaseReceipts=[]){
  const jobs=results.map(x=>({
    run_id:x.receipt?.run_id || x.id,
    agent_id:x.agent_id,
    computer_id:x.computer_id,
    district:x.district,
    task_type:x.task,
    status:x.status,
    verification_tier:x.verification_tier || null,
    business_output_verified:x.business_output_verified===true,
    evidence:x.receipt?.evidence || [],
    artifact_sha256:x.receipt?.evidence?.find(e=>e.type==='artifact')?.sha256 || null
  }));
  const value={
    schema:'cc.phase.handoff.v1',
    mission_id:missionId,
    phase:phaseName,
    generated_at:new Date().toISOString(),
    verified_jobs:jobs.filter(x=>x.status==='VERIFIED').length,
    failed_jobs:jobs.filter(x=>x.status!=='VERIFIED').length,
    upstream_phases_verified:upstreamPhaseReceipts.every(x=>x.status==='VERIFIED'),
    upstream_phases:upstreamPhaseReceipts.map(x=>({phase:x.phase,status:x.status,sha256:x.sha256})),
    jobs
  };
  const {raw,sha256}=hashJson(value);
  const rel=path.posix.join('.runtime','handoffs',missionId,phaseName+'.json');
  fs.writeFileSync(path.join(repoRoot,...rel.split('/')),raw);
  return {rel,sha256,value};
}

async function runPhase(phase,index,priorHandoffs){
  const phaseStarted=new Date().toISOString();
  const handoffPaths=priorHandoffs.map(x=>x.rel);
  const primaryHandoff=priorHandoffs.at(-1)?.rel || null;
  const selected=(phase.agent_ids||[]).map(resolveAgent);

  const results=await Promise.all(selected.map(async (x,jobIndex)=>{
    const runId=`${missionId}-p${String(index+1).padStart(2,'0')}-${String(jobIndex+1).padStart(2,'0')}-${x.agent.id}`;
    const runtimeAgent={
      ...x.agent,
      runtime_extra_read_paths:handoffPaths,
      runtime_handoff_rel:primaryHandoff
    };
    const job={
      id:runId,
      mission_id:missionId,
      phase:phase.id,
      agent_id:x.agent.id,
      district:x.agent.district,
      computer_id:x.computer.id,
      task:x.task,
      status:'RUNNING',
      started_at:new Date().toISOString()
    };
    fs.writeFileSync(path.join(missionDir,runId+'.job.json'),JSON.stringify(job,null,2)+'\n');
    try{
      const receipt=await launchComputer({repoRoot,agent:runtimeAgent,computer:x.computer,task:x.task,runId});
      const verification=verifyReceipt({receipt,repoRoot,agentsDoc,computersDoc,tasksDoc});
      const publication=verification.verified
        ? publishOperationalOutput({repoRoot,agent:x.agent,receipt})
        : {published:false,reason:'receipt_not_verified'};
      const final={
        ...job,
        status:verification.verified?'VERIFIED':'FAILED_PROOF',
        verification_tier:receipt.verification_tier,
        business_output_verified:receipt.business_output_verified===true,
        ended_at:new Date().toISOString(),
        receipt,
        verification,
        publication
      };
      fs.writeFileSync(path.join(missionDir,runId+'.job.json'),JSON.stringify(final,null,2)+'\n');
      return final;
    }catch(e){
      const final={...job,status:'FAILED_RUN',ended_at:new Date().toISOString(),error:String(e?.message||e)};
      fs.writeFileSync(path.join(missionDir,runId+'.job.json'),JSON.stringify(final,null,2)+'\n');
      return final;
    }
  }));

  const failures=results.filter(x=>x.status!=='VERIFIED');
  const handoff=writeHandoff(phase.id,results,phaseReceipts);
  const phaseReceipt={
    schema:'cc.phase.receipt.v1',
    mission_id:missionId,
    phase:phase.id,
    order:index+1,
    started_at:phaseStarted,
    ended_at:new Date().toISOString(),
    requested_agents:selected.length,
    verified_jobs:results.filter(x=>x.status==='VERIFIED').length,
    failed_jobs:failures.length,
    status:failures.length?'FAILED':'VERIFIED',
    handoff_path:handoff.rel,
    handoff_sha256:handoff.sha256,
    upstream_handoff_paths:handoffPaths
  };
  const h=hashJson(phaseReceipt);
  phaseReceipt.sha256=h.sha256;
  fs.writeFileSync(path.join(missionDir,`PHASE-${String(index+1).padStart(2,'0')}-${phase.id}.json`),JSON.stringify(phaseReceipt,null,2)+'\n');
  return {phaseReceipt,results,handoff};
}

const phases=mission.phases||[];
if(!phases.length) throw new Error('phased mission requires phases');

const handoffs=[];
for(let i=0;i<phases.length;i++){
  const phase=phases[i];
  const {phaseReceipt,results,handoff}=await runPhase(phase,i,handoffs);
  phaseReceipts.push(phaseReceipt);
  allResults.push(...results);
  handoffs.push(handoff);
  if(phaseReceipt.status!=='VERIFIED'){
    console.error(`FAILED: phase ${phase.id} — ${phaseReceipt.failed_jobs} failed jobs`);
    break;
  }
}

const failures=allResults.filter(x=>x.status!=='VERIFIED');
const allPhasesRan=phaseReceipts.length===phases.length;
const allPhasesVerified=allPhasesRan && phaseReceipts.every(x=>x.status==='VERIFIED');
const tiers=allResults.map(x=>x.verification_tier).filter(Boolean);
const businessStatus=!allPhasesVerified?'FAILED':
  tiers.length&&tiers.every(x=>x==='operational')?'OPERATIONAL':
  tiers.length&&tiers.every(x=>x==='gateway')?'GATEWAY_PROOF':
  tiers.length&&tiers.every(x=>x==='structural')?'STRUCTURAL_ONLY':'MIXED_NON_OPERATIONAL';

const summary={
  schema:'cc.phased.mission.receipt.v1',
  mission_id:missionId,
  purpose:mission.purpose||null,
  backend,
  started_at:startedAt,
  ended_at:new Date().toISOString(),
  phase_order:phaseReceipts.map(x=>x.phase),
  phases_requested:phases.length,
  phases_completed:phaseReceipts.length,
  all_phases_verified:allPhasesVerified,
  verified_jobs:allResults.filter(x=>x.status==='VERIFIED').length,
  failed_jobs:failures.length,
  status:allPhasesVerified?'VERIFIED':'FAILED',
  business_status:businessStatus,
  phases:phaseReceipts,
  jobs:allResults.map(x=>({
    id:x.id,phase:x.phase,agent_id:x.agent_id,district:x.district,computer_id:x.computer_id,
    task:x.task,status:x.status,verification_tier:x.verification_tier,
    business_output_verified:x.business_output_verified===true,
    published_output:x.publication?.published===true?x.publication.path:null
  }))
};
const h=hashJson(summary);
summary.sha256=h.sha256;
fs.writeFileSync(path.join(missionDir,'MISSION-RECEIPT.json'),JSON.stringify(summary,null,2)+'\n');

console.log(`${summary.status}: ${missionId} — phases=${summary.phase_order.join(' -> ')}; jobs=${summary.verified_jobs}/${allResults.length}; business=${summary.business_status}`);
if(summary.status!=='VERIFIED') process.exit(1);
