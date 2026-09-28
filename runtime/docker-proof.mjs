import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { launchDockerComputer } from './backends/docker.mjs';
import { verifyReceipt } from './lib/receipt.mjs';

const repoRoot=process.cwd();
const image=process.env.CC_DOCKER_IMAGE || 'node:22-alpine';

const version=spawnSync('docker',['version','--format','{{.Server.Version}}'],{encoding:'utf8'});
if(version.status!==0){
  console.error('Docker proof unavailable: docker daemon is not reachable.');
  process.exit(3);
}

const pull=spawnSync('docker',['pull',image],{encoding:'utf8',stdio:'inherit'});
if(pull.status!==0) process.exit(pull.status||1);

const agentsDoc=JSON.parse(fs.readFileSync(path.join(repoRoot,'runtime','agents.json'),'utf8'));
const computersDoc=JSON.parse(fs.readFileSync(path.join(repoRoot,'runtime','computers.json'),'utf8'));
const tasksDoc=JSON.parse(fs.readFileSync(path.join(repoRoot,'runtime','tasks.json'),'utf8'));
const allAgents=[agentsDoc.manager,...agentsDoc.agents];
const stamp=Date.now();

const receipts=await Promise.all(allAgents.map(async (agent,index)=>{
  const computer=computersDoc.computers.find(x=>x.id===agent.computer_id);
  const task=tasksDoc.tasks.find(x=>x.agent_id===agent.id)?.task;
  if(!computer||!task) throw new Error(`incomplete registry for ${agent.id}`);
  return launchDockerComputer({
    repoRoot,agent,computer,task,
    runId:`docker-proof-${stamp}-${String(index+1).padStart(2,'0')}-${agent.id}`,
    image
  });
}));

const failures=[];
const hosts=receipts.map(x=>x.runtime_host_id);
if(new Set(hosts).size!==receipts.length) failures.push('container runtime host IDs are not unique');
if(receipts.some(x=>x.runtime_backend!=='docker')) failures.push('one or more receipts did not identify docker backend');
if(receipts.some(x=>!x.evidence?.some(e=>e.type==='scope_probe'&&e.passed))) failures.push('one or more receipts missing passed scope probe');
if(receipts.some(x=>!x.scope_sha256)) failures.push('one or more receipts missing scope hash');
if(receipts.some(x=>!(x.scope_file_count>0))) failures.push('one or more receipts has empty scoped input');

for(const receipt of receipts){
  const v=verifyReceipt({receipt,repoRoot,agentsDoc,computersDoc,tasksDoc});
  if(!v.verified) failures.push(`${receipt.agent_id}: ${v.errors.join('; ')}`);
  if(!receipt.container_name) failures.push(`${receipt.agent_id}: missing container name`);
}

const summary={
  schema:'cc.docker.proof.v1',
  generated_at:new Date().toISOString(),
  docker_server:version.stdout.trim(),
  image,
  agents:receipts.length,
  unique_computers:new Set(receipts.map(x=>x.computer_id)).size,
  unique_containers:new Set(hosts).size,
  network_mode:'none',
  root_filesystem:'read-only',
  capabilities:'ALL dropped',
  no_new_privileges:true,
  repository_mount:'DENIED',
  runtime_code_mount:'READ_ONLY',
  scoped_input_mount:'READ_ONLY',
  writable_mount:'OWN_COMPUTER_ONLY',
  scope_manifests_verified:receipts.every(x=>x.evidence?.some(e=>e.type==='scope_probe'&&e.passed)),
  status:failures.length?'FAILED':'VERIFIED',
  failures,
  receipts:receipts.map(x=>({
    agent_id:x.agent_id,district:x.district,computer_id:x.computer_id,
    runtime_host_id:x.runtime_host_id,container_name:x.container_name,
    task_type:x.task_type,status:x.status
  }))
};

fs.mkdirSync(path.join(repoRoot,'outbox'),{recursive:true});
fs.writeFileSync(path.join(repoRoot,'outbox','DOCKER-COMPUTER-PROOF.json'),JSON.stringify(summary,null,2)+'\n');

if(failures.length){
  console.error('Docker computer proof FAILED');
  failures.forEach(x=>console.error('- '+x));
  process.exit(1);
}
console.log(`Docker computer proof VERIFIED: ${summary.agents} agents on ${summary.unique_containers} isolated containers/computers.`);
