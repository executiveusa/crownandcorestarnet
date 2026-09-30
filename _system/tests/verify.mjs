import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root=process.cwd();
const out=path.join(root,'outbox','test');
fs.rmSync(out,{recursive:true,force:true});
fs.mkdirSync(out,{recursive:true});
const failures=[];

function run(name,args,expected=0){
  const r=spawnSync(process.execPath,args,{cwd:root,encoding:'utf8'});
  const code=r.status ?? 1;
  if(code!==expected) failures.push(`${name}: expected ${expected}, got ${code}\n${r.stdout}\n${r.stderr}`);
  return r;
}

run('system check',['_system/pipelines/system-check/index.mjs']);
run('middleton validation',['districts/middleton/stages/02_diagnose/validate/index.mjs']);
run('gap audit',['districts/management/stages/02_diagnose/gap-audit/index.mjs']);
run('public baseline',['districts/conversion/stages/01_observe/public-baseline/index.mjs']);
run('data readiness test',['_system/tests/data-readiness.mjs']);
run('model seam test',['_system/tests/model-smoke.mjs']);
run('read-only intake test',['_system/tests/read-only-intake.mjs']);
run('booking proof',['_system/tests/booking-proof.mjs']);
run('live readiness',['_system/tests/live-readiness.mjs']);
run('Square read-only adapter',['_system/tests/square-readonly-adapter.mjs']);
run('state promotion',['_system/tests/state-promotion.mjs']);
run('operational agent protocol',['_system/tests/operational-agent-protocol.mjs']);
run('operational output publisher',['_system/tests/operational-output-publish.mjs']);

const approvedOut=path.join(out,'approved.json');
run('approval allow',[
  '_system/pipelines/approval-gate/index.mjs',
  '--input=_system/tests/fixtures/action-approved.json',
  `--out=${approvedOut}`
]);
const approved=JSON.parse(fs.readFileSync(approvedOut,'utf8'));
if(approved.decision!=='ALLOW') failures.push('approved gated action did not ALLOW');

const blockedOut=path.join(out,'blocked.json');
run('approval block',[
  '_system/pipelines/approval-gate/index.mjs',
  '--input=_system/tests/fixtures/action-blocked.json',
  `--out=${blockedOut}`
],2);
const blocked=JSON.parse(fs.readFileSync(blockedOut,'utf8'));
if(blocked.decision!=='BLOCK') failures.push('unapproved gated action did not BLOCK');

const r3Out=path.join(out,'r3.json');
run('R3 draft',[
  'districts/return/stages/03_draft/r3-reactivation/index.mjs',
  '--input=_system/tests/fixtures/reactivation-ready.json',
  `--out=${r3Out}`
]);
const r3=JSON.parse(fs.readFileSync(r3Out,'utf8'));
if(r3.status!=='READY_FOR_APPROVAL_GATE') failures.push('R3 ready fixture did not reach approval gate');
if(r3.hard_rules?.review_gating!==false) failures.push('R3 does not forbid review gating');

const mediaOut=path.join(out,'media.json');
run('media plan',[
  'districts/media/stages/03_draft/media-engine/index.mjs',
  '--input=_system/tests/fixtures/media-ready.json',
  `--out=${mediaOut}`
]);
const media=JSON.parse(fs.readFileSync(mediaOut,'utf8'));
if(media.status!=='READY_TO_EDIT') failures.push('media ready fixture did not reach READY_TO_EDIT');
if(media.publishing_status!=='NOT_APPROVED_FOR_PUBLISHING') failures.push('media fixture should remain unapproved for publishing');

const reportOut=path.join(out,'report.md');
run('monthly report',[
  'districts/management/stages/06_verify/monthly-report/index.mjs',
  `--out=${reportOut}`
]);
if(!fs.existsSync(reportOut)) failures.push('monthly report was not generated');

if(failures.length){
  console.error('Verification failed');
  failures.forEach(x=>console.error(x));
  process.exit(1);
}
console.log('All Crown & Core StarNet verification tests passed from canonical ICM paths.');
