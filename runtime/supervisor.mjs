import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';

const root=process.cwd();
const agentsDoc=JSON.parse(fs.readFileSync(path.join(root,'runtime','agents.json'),'utf8'));
const computersDoc=JSON.parse(fs.readFileSync(path.join(root,'runtime','computers.json'),'utf8'));
const allAgents=[agentsDoc.manager,...agentsDoc.agents];
const runtimeRoot=path.join(root,'.runtime','computers');
fs.mkdirSync(runtimeRoot,{recursive:true});

const now=Date.now();

function launch(agent,index){
  const computer=computersDoc.computers.find(x=>x.id===agent.computer_id);
  if(!computer) return Promise.reject(new Error(`missing computer for ${agent.id}`));
  const computerRoot=path.join(root,'.runtime','computers',computer.id);
  const workspace=path.join(computerRoot,'workspace');
  const home=path.join(computerRoot,'home');
  const tmp=path.join(computerRoot,'tmp');
  [workspace,home,tmp].forEach(p=>fs.mkdirSync(p,{recursive:true}));
  const runId=`proof-${now}-${String(index+1).padStart(2,'0')}-${agent.id}`;

  return new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,[path.join(root,'runtime','agent-worker.mjs')],{
      cwd:workspace,
      env:{
        PATH:process.env.PATH || '',
        SystemRoot:process.env.SystemRoot || '',
        HOME:home,
        USERPROFILE:home,
        TMPDIR:tmp,
        TMP:tmp,
        TEMP:tmp,
        CC_AGENT_ID:agent.id,
        CC_COMPUTER_ID:computer.id,
        CC_DISTRICT:agent.district,
        CC_RUN_ID:runId,
        CC_COMPUTER_ROOT:computerRoot
      },
      stdio:['ignore','pipe','pipe']
    });
    let stdout='',stderr='';
    child.stdout.on('data',d=>stdout+=d);
    child.stderr.on('data',d=>stderr+=d);
    child.on('error',reject);
    child.on('close',code=>{
      if(code!==0) return reject(new Error(`${agent.id} exit ${code}: ${stderr||stdout}`));
      try{
        const receipt=JSON.parse(stdout.trim().split(/\r?\n/).at(-1));
        resolve({...receipt,spawn_pid:child.pid,computer_root:path.relative(root,computerRoot)});
      }catch(e){ reject(new Error(`${agent.id} invalid receipt: ${stdout}`)); }
    });
  });
}

const receipts=await Promise.all(allAgents.map(launch));
const failures=[];
if(new Set(receipts.map(x=>x.pid)).size!==receipts.length) failures.push('process IDs not unique during concurrent proof');
if(new Set(receipts.map(x=>x.computer_id)).size!==receipts.length) failures.push('computer IDs not unique');
if(new Set(receipts.map(x=>x.computer_root)).size!==receipts.length) failures.push('computer roots not unique');

for(const receipt of receipts){
  if(receipt.status!=='COMPLETED') failures.push(`${receipt.agent_id} did not complete`);
  if(!receipt.evidence?.some(x=>x.type==='isolation_probe'&&x.passed)) failures.push(`${receipt.agent_id} missing isolation proof`);
  const art=receipt.evidence?.find(x=>x.type==='artifact');
  if(!art){ failures.push(`${receipt.agent_id} missing artifact evidence`); continue; }
  const abs=path.join(root,receipt.computer_root,art.path);
  if(!fs.existsSync(abs)){ failures.push(`${receipt.agent_id} artifact missing`); continue; }
  const hash=crypto.createHash('sha256').update(fs.readFileSync(abs)).digest('hex');
  if(hash!==art.sha256) failures.push(`${receipt.agent_id} artifact hash mismatch`);
}

const summary={
  schema:'cc.runtime.proof.v1',
  generated_at:new Date().toISOString(),
  backend:computersDoc.backend,
  agent_count:receipts.length,
  computer_count:new Set(receipts.map(x=>x.computer_id)).size,
  district_count:new Set(receipts.map(x=>x.district)).size,
  all_completed:failures.length===0,
  failures,
  receipts
};
const out=path.join(root,'outbox');
fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(path.join(out,'RUNTIME-PROOF.json'),JSON.stringify(summary,null,2)+'\n');

if(failures.length){
  console.error('Runtime proof FAILED');
  failures.forEach(x=>console.error('- '+x));
  process.exit(1);
}
console.log(`Runtime proof passed: ${summary.agent_count} independent agent processes on ${summary.computer_count} dedicated computers across ${summary.district_count} districts.`);
