import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { publishOperationalOutput } from '../runtime/lib/publish-output.mjs';

const root=fs.mkdtempSync(path.join(os.tmpdir(),'cc-output-publish-'));
const computer='cc-pc-conversion-1';
const artifactRel='workspace/proof/run-1.json';
const artifactPath=path.join(root,'.runtime','computers',computer,artifactRel);
fs.mkdirSync(path.dirname(artifactPath),{recursive:true});

const artifact={
  verification_tier:'operational',
  model_analysis:{
    status:'UNKNOWN',
    summary:'Booking completion still needs verification.',
    findings:[{claim:'Public booking destination is verified.',evidence_refs:['_shared/evidence/public-booking-path-2026-09-28.json'],confidence:'high'}],
    unknowns:['Final booking completion is unknown.'],
    next_action:'Run the approved completion-path test.',
    requires_human_approval:true
  }
};
const raw=JSON.stringify(artifact,null,2)+'\n';
fs.writeFileSync(artifactPath,raw);
const artifactSha=crypto.createHash('sha256').update(raw).digest('hex');

const receipt={
  run_id:'run-1',
  agent_id:'path-auditor',
  computer_id:computer,
  district:'conversion',
  ended_at:'2026-09-30T06:45:00Z',
  verification_tier:'operational',
  business_output_verified:true,
  evidence:[
    {type:'artifact',path:artifactRel,sha256:artifactSha,bytes:Buffer.byteLength(raw)},
    {type:'context_bundle',sha256:'a'.repeat(64)},
    {type:'model_run',response_sha256:'b'.repeat(64)}
  ]
};
const agent={
  id:'path-auditor',
  district:'conversion',
  output_path:'districts/conversion/output/path-audit.md'
};

const failures=[];
const published=publishOperationalOutput({repoRoot:root,agent,receipt});
if(!published.published) failures.push('operational output was not published');
const out=path.join(root,agent.output_path);
if(!fs.existsSync(out)) failures.push('output file missing');
else {
  const text=fs.readFileSync(out,'utf8');
  if(!text.includes('business_output_verified: true')) failures.push('output lacks verified marker');
  if(!text.includes('Final booking completion is unknown.')) failures.push('output lost unknowns');
  if(!text.includes('Required before any gated execution.')) failures.push('output lost human gate');
}

const gateway=publishOperationalOutput({repoRoot:root,agent,receipt:{...receipt,verification_tier:'gateway',business_output_verified:false}});
if(gateway.published!==false) failures.push('gateway proof published business state');

let escaped=false;
try{
  publishOperationalOutput({repoRoot:root,agent:{...agent,output_path:'districts/media/output/escape.md'},receipt});
}catch{ escaped=true; }
if(!escaped) failures.push('cross-district output path was not blocked');

if(failures.length){
  console.error('Operational output publisher test FAILED');
  failures.forEach(x=>console.error('- '+x));
  process.exit(1);
}
console.log('Operational output publisher test passed.');
