import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const REQUIRED=['run_id','agent_id','computer_id','district','pid','started_at','ended_at','task_type','status','verification_tier','business_output_verified','evidence'];

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
  const contextBundle=(receipt.evidence||[]).find(x=>x.type==='context_bundle');
  if(!contextBundle) errors.push('missing context-bundle proof');
  else {
    if(!/^[a-f0-9]{64}$/.test(contextBundle.sha256||'')) errors.push('invalid context bundle hash');
    if(!(contextBundle.file_count>0)) errors.push('empty context bundle');
  }

  const modelRun=(receipt.evidence||[]).find(x=>x.type==='model_run');
  if(!modelRun) errors.push('missing model-run proof');
  else {
    if(!/^[a-f0-9]{64}$/.test(modelRun.response_sha256||'')) errors.push('invalid model response hash');
    if(receipt.verification_tier==='operational'){
      if(modelRun.external!==true) errors.push('operational receipt requires external model run');
      if(modelRun.structured_output!==true) errors.push('operational receipt requires structured model output');
      if(modelRun.trust_level!=='live') errors.push('operational receipt requires live trust level');
      if(modelRun.business_analysis_verified!==true) errors.push('operational receipt missing business-analysis verification');
      if(receipt.business_output_verified!==true) errors.push('operational receipt must mark business_output_verified');
    }
    if(receipt.verification_tier==='gateway'){
      if(modelRun.external!==true) errors.push('gateway receipt requires model gateway call');
      if(modelRun.structured_output!==true) errors.push('gateway receipt requires structured model output');
      if(modelRun.trust_level==='live') errors.push('gateway receipt cannot use live trust level');
      if(modelRun.business_analysis_verified!==false) errors.push('gateway proof cannot mark business analysis verified');
      if(receipt.business_output_verified!==false) errors.push('gateway proof cannot mark business output verified');
    }
    if(receipt.verification_tier==='structural' && receipt.business_output_verified!==false) {
      errors.push('structural receipt cannot mark business output verified');
    }
  }
  if(!['structural','gateway','operational'].includes(receipt.verification_tier)) errors.push('invalid verification tier');

  return {verified:errors.length===0,errors,verification_tier:receipt.verification_tier,business_output_verified:receipt.business_output_verified===true};
}
