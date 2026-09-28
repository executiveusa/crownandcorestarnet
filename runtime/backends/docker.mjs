import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

function safeName(s){ return String(s).toLowerCase().replace(/[^a-z0-9_.-]+/g,'-').slice(0,50); }

export function launchDockerComputer({repoRoot,agent,computer,task,runId,image='node:22-alpine'}){
  const computerRoot=path.join(repoRoot,'.runtime','computers',computer.id);
  const workspace=path.join(computerRoot,'workspace');
  const home=path.join(computerRoot,'home');
  const tmp=path.join(computerRoot,'tmp');
  [workspace,home,tmp].forEach(p=>fs.mkdirSync(p,{recursive:true}));

  const containerName=safeName(`cc-${agent.id}-${runId}`);
  const args=[
    'run','--rm',
    '--name',containerName,
    '--hostname',containerName,
    '--network','none',
    '--read-only',
    '--cap-drop','ALL',
    '--security-opt','no-new-privileges',
    '--pids-limit','64',
    '--memory','256m',
    '--cpus','0.50',
    '-v',`${repoRoot}:/repo:ro`,
    '-v',`${computerRoot}:/computer:rw`,
    '-w','/computer/workspace',
    '-e',`HOME=/computer/home`,
    '-e',`USERPROFILE=/computer/home`,
    '-e',`TMPDIR=/computer/tmp`,
    '-e',`TMP=/computer/tmp`,
    '-e',`TEMP=/computer/tmp`,
    '-e',`CC_AGENT_ID=${agent.id}`,
    '-e',`CC_COMPUTER_ID=${computer.id}`,
    '-e',`CC_DISTRICT=${agent.district}`,
    '-e',`CC_RUN_ID=${runId}`,
    '-e','CC_COMPUTER_ROOT=/computer',
    '-e','CC_REPO_ROOT=/repo',
    '-e',`CC_TASK=${task}`,
    '-e','CC_RUNTIME_BACKEND=docker',
    '-e',`CC_RUNTIME_HOST_ID=${containerName}`,
    image,
    'node','/repo/runtime/agent-worker.mjs'
  ];

  return new Promise((resolve,reject)=>{
    const child=spawn('docker',args,{cwd:repoRoot,stdio:['ignore','pipe','pipe']});
    let stdout='',stderr='';
    child.stdout.on('data',d=>stdout+=d);
    child.stderr.on('data',d=>stderr+=d);
    child.on('error',reject);
    child.on('close',code=>{
      if(code!==0) return reject(new Error(`docker ${agent.id} exit ${code}: ${stderr||stdout}`));
      try{
        const receipt=JSON.parse(stdout.trim().split(/\r?\n/).at(-1));
        resolve({...receipt,container_name:containerName,docker_cli_pid:child.pid,computer_root:path.relative(repoRoot,computerRoot)});
      }catch(e){ reject(new Error(`${agent.id} invalid docker receipt: ${stdout}\n${stderr}`)); }
    });
  });
}
