import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const REQUIRED=['run_id','agent_id','computer_id','district','pid','started_at','ended_at','task_type','status','evidence'];

export function verifyReceipt({receipt,repoRoot,agentsDoc,computersDoc,tasksDoc}){
  const errors=[];
  for(const key of REQUIRED){
    if(receipt[key]===undefined || receipt[key]===null) errors.push(`missing ${key}`);
  }
  const allAgents=[agentsDoc.manager,...agentsDoc.agents];
  const agent=allAgents.find(x=>x.id===receipt.agent_id);
  if(!agent) errors.push('unknown agent');
  else {
    if(agent.computer_id!==receipt.computer_id) errors.push('computer does not belong to agent');
    if(agent.district!==receipt.district) errors.push('district does not match agent registry');
  }
  const computer=computersDoc.computers.find(x=>x.id===receipt.computer_id);
  if(!computer) errors.push('unknown computer');
  else if(computer.agent_id!==receipt.agent_id) errors.push('computer registry owner mismatch');

  const task=tasksDoc.tasks.find(x=>x.agent_id===receipt.agent_id);
  if(!task) errors.push('missing assigned task');
  else if(task.task!==receipt.task_type) errors.push('receipt task does not match assigned task');

  if(receipt.status!=='COMPLETED') errors.push('receipt status is not COMPLETED');
  const start=Date.parse(receipt.started_at), end=Date.parse(receipt.ended_at);
  if(!Number.isFinite(start)||!Number.isFinite(end)||end<start) errors.push('invalid timestamps');

  const artifactEvidence=(receipt.evidence||[]).filter(x=>x.type==='artifact');
  if(!artifactEvidence.length) errors.push('missing artifact evidence');
  for(const art of artifactEvidence){
    const computerRoot=path.join(repoRoot,'.runtime','computers',receipt.computer_id);
    const abs=path.resolve(computerRoot,art.path||'');
    if(!abs.startsWith(path.resolve(computerRoot)+path.sep)) { errors.push('artifact path escapes computer root'); continue; }
    if(!fs.existsSync(abs)){ errors.push(`artifact missing: ${art.path}`); continue; }
    const hash=crypto.createHash('sha256').update(fs.readFileSync(abs)).digest('hex');
    if(hash!==art.sha256) errors.push(`artifact hash mismatch: ${art.path}`);
  }

  if(!(receipt.evidence||[]).some(x=>x.type==='isolation_probe'&&x.passed===true)) errors.push('missing isolation proof');
  if(!(receipt.evidence||[]).some(x=>x.type==='domain_assertion')) errors.push('missing domain assertion');
  const modelRun=(receipt.evidence||[]).find(x=>x.type==='model_run');
  if(!modelRun) errors.push('missing model-run proof');
  else if(!/^[a-f0-9]{64}$/.test(modelRun.response_sha256||'')) errors.push('invalid model response hash');

  return {verified:errors.length===0,errors};
}
