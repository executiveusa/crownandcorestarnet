import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

export function launchLocalProcess({repoRoot,agent,computer,task,runId}){
  const computerRoot=path.join(repoRoot,'.runtime','computers',computer.id);
  const workspace=path.join(computerRoot,'workspace');
  const home=path.join(computerRoot,'home');
  const tmp=path.join(computerRoot,'tmp');
  [workspace,home,tmp].forEach(p=>fs.mkdirSync(p,{recursive:true}));

  return new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,[path.join(repoRoot,'_system','runtime','agent-worker.mjs')],{
      cwd:workspace,
      env:{
        PATH:process.env.PATH||'',
        SystemRoot:process.env.SystemRoot||'',
        HOME:home,
        USERPROFILE:home,
        TMPDIR:tmp,
        TMP:tmp,
        TEMP:tmp,
        CC_AGENT_ID:agent.id,
        CC_COMPUTER_ID:computer.id,
        CC_DISTRICT:agent.district,
        CC_RUN_ID:runId,
        CC_COMPUTER_ROOT:computerRoot,
        CC_REPO_ROOT:repoRoot,
        CC_TASK:task,
        ...(agent.runtime_handoff_rel?{CC_RUNTIME_HANDOFF_REL:agent.runtime_handoff_rel}:{}),
        CC_PROMPT_PATH:agent.prompt_path || `districts/${agent.district}/agents/${agent.id}/PROMPT.md`
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
        resolve({...receipt,spawn_pid:child.pid,computer_root:path.relative(repoRoot,computerRoot)});
      }catch(e){reject(new Error(`${agent.id} invalid receipt: ${stdout}`));}
    });
  });
}
