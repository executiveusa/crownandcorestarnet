import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const root=process.cwd();
const args=Object.fromEntries(process.argv.slice(2).map(x=>{
  const i=x.indexOf('=');
  return i>0?[x.slice(2,i),x.slice(i+1)]:[x.replace(/^--/,''),'true'];
}));
const mode=args.mode||'mock';
if(!['mock','live'].includes(mode)) throw new Error('mode must be mock or live');

if(mode==='live'){
  for(const key of ['CC_UPSTREAM_MODEL_BASE_URL','CC_UPSTREAM_MODEL_API_KEY','CC_UPSTREAM_MODEL_ID']){
    if(!process.env[key]){
      console.error('BLOCKED: live mode requires CC_UPSTREAM_MODEL_BASE_URL, CC_UPSTREAM_MODEL_API_KEY, and CC_UPSTREAM_MODEL_ID.');
      process.exit(3);
    }
  }
}

function docker(a,{allowFailure=false}={}){
  const r=spawnSync('docker',a,{cwd:root,encoding:'utf8'});
  if(!allowFailure&&r.status!==0) throw new Error(`docker ${a.join(' ')} failed: ${r.stderr||r.stdout}`);
  return r;
}

function waitHttpInContainer(name,url){
  for(let i=0;i<40;i++){
    const r=docker(['exec',name,'node','-e',`fetch('${url}').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))`],{allowFailure:true});
    if(r.status===0) return;
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,200);
  }
  throw new Error(`health check failed: ${name} ${url}`);
}

const suffix=crypto.randomBytes(4).toString('hex');
const gateway=`cc-model-gateway-${suffix}`;
const upstreamNet=`cc-upstream-${suffix}`;
const mock=`cc-mock-upstream-${suffix}`;
const localToken=crypto.randomBytes(24).toString('hex');
const gatewayDir=path.join(root,'_system','runtime','model-gateway');

let startedMock=false;
let startedGateway=false;
let createdUpstreamNet=false;
let missionStatus=1;

try{
  let upstreamBase,upstreamKey,upstreamModel;

  if(mode==='mock'){
    docker(['network','create',upstreamNet]);
    createdUpstreamNet=true;
    docker([
      'run','-d','--rm',
      '--name',mock,
      '--network',upstreamNet,
      '--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--pids-limit','64','--memory','128m',
      '--tmpfs','/tmp:rw,noexec,nosuid,size=16m',
      '--network-alias','mock-upstream',
      '-v',`${gatewayDir}:/gateway:ro`,
      '-e','PORT=8790',
      'node:22-alpine',
      'node','/gateway/mock-upstream.mjs'
    ]);
    startedMock=true;
    waitHttpInContainer(mock,'http://127.0.0.1:8790/health');
    upstreamBase='http://mock-upstream:8790/v1';
    upstreamKey='mock-key';
    upstreamModel='mock-model';
  } else {
    upstreamBase=process.env.CC_UPSTREAM_MODEL_BASE_URL;
    upstreamKey=process.env.CC_UPSTREAM_MODEL_API_KEY;
    upstreamModel=process.env.CC_UPSTREAM_MODEL_ID;
  }

  const gatewayArgs=[
    'run','-d','--rm',
    '--name',gateway,
    ...(mode==='mock'?['--network',upstreamNet]:[]),
    '--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--pids-limit','64','--memory','128m',
    '--tmpfs','/tmp:rw,noexec,nosuid,size=16m',
    '-v',`${gatewayDir}:/gateway:ro`,
    '-e','PORT=8787',
    '-e',`CC_GATEWAY_TOKEN=${localToken}`,
    '-e',`CC_UPSTREAM_BASE_URL=${upstreamBase}`,
    '-e',`CC_UPSTREAM_API_KEY=${upstreamKey}`,
    '-e',`CC_UPSTREAM_MODEL=${upstreamModel}`,
    'node:22-alpine',
    'node','/gateway/server.mjs'
  ];
  docker(gatewayArgs);
  startedGateway=true;
  waitHttpInContainer(gateway,'http://127.0.0.1:8787/health');

  const missionFile=mode==='live'
    ? '_system/runtime/missions/phased-operational.json'
    : '_system/runtime/missions/phased-gateway-proof.json';

  const childEnv={
    ...process.env,
    CC_MODEL_GATEWAY_CONTAINER:gateway,
    CC_MODEL_GATEWAY_TOKEN:localToken,
    CC_MODEL_GATEWAY_MODEL:upstreamModel,
    CC_MODEL_TRUST_LEVEL:mode==='live'?'live':'gateway'
  };

  const mission=spawnSync(process.execPath,[
    path.join(root,'_system','runtime','phased-orchestrator.mjs'),
    '--backend=docker-operational',
    `--mission=${missionFile}`
  ],{cwd:root,encoding:'utf8',env:childEnv});

  process.stdout.write(mission.stdout||'');
  process.stderr.write(mission.stderr||'');
  missionStatus=mission.status??1;
  if(missionStatus===0){
    const missionId=mode==='live'?'phased-operational-all':'phased-gateway-proof-all';
    const receiptPath=path.join(root,'.runtime','missions',missionId,'MISSION-RECEIPT.json');
    const receipt=JSON.parse(fs.readFileSync(receiptPath,'utf8'));
    const expected=mode==='live'?'OPERATIONAL':'GATEWAY_PROOF';
    if(receipt.business_status!==expected){
      console.error(`Mission proof mismatch: expected business_status=${expected}, got ${receipt.business_status}`);
      missionStatus=1;
    } else {
      console.log(`Verified mission tier: ${receipt.business_status}`);
    }
  }
} finally {
  if(startedGateway) docker(['rm','-f',gateway],{allowFailure:true});
  if(startedMock) docker(['rm','-f',mock],{allowFailure:true});
  if(createdUpstreamNet) docker(['network','rm',upstreamNet],{allowFailure:true});
}

process.exit(missionStatus);
