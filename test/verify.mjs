import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const out = path.join(root,'outbox','test');
fs.rmSync(out,{recursive:true,force:true});
fs.mkdirSync(out,{recursive:true});

const failures=[];

function run(name,args,expected=0){
  const r=spawnSync(process.execPath,args,{cwd:root,encoding:'utf8'});
  const code=r.status ?? 1;
  if(code!==expected){
    failures.push(`${name}: expected ${expected}, got ${code}\n${r.stdout}\n${r.stderr}`);
  }
  return r;
}

run('system check',['workflows/system-check/index.mjs']);
run('middleton validation',['workflows/middleton/validate.mjs']);
run('gap audit',['workflows/gap-audit/index.mjs']);

const approvedOut=path.join(out,'approved.json');
run('approval allow',[
  'workflows/approval-gate/index.mjs',
  '--input=test/fixtures/action-approved.json',
  `--out=${approvedOut}`
]);
const approved=JSON.parse(fs.readFileSync(approvedOut,'utf8'));
if(approved.decision!=='ALLOW') failures.push('approved gated action did not ALLOW');

const blockedOut=path.join(out,'blocked.json');
run('approval block',[
  'workflows/approval-gate/index.mjs',
  '--input=test/fixtures/action-blocked.json',
  `--out=${blockedOut}`
],2);
const blocked=JSON.parse(fs.readFileSync(blockedOut,'utf8'));
if(blocked.decision!=='BLOCK') failures.push('unapproved gated action did not BLOCK');

const r3Out=path.join(out,'r3.json');
run('R3 draft',[
  'workflows/r3-reactivation/index.mjs',
  '--input=test/fixtures/reactivation-ready.json',
  `--out=${r3Out}`
]);
const r3=JSON.parse(fs.readFileSync(r3Out,'utf8'));
if(r3.status!=='READY_FOR_APPROVAL_GATE') failures.push('R3 ready fixture did not reach approval gate');
if(r3.hard_rules?.review_gating!==false) failures.push('R3 does not forbid review gating');

const mediaOut=path.join(out,'media.json');
run('media plan',[
  'workflows/media-engine/index.mjs',
  '--input=test/fixtures/media-ready.json',
  `--out=${mediaOut}`
]);
const media=JSON.parse(fs.readFileSync(mediaOut,'utf8'));
if(media.status!=='READY_TO_EDIT') failures.push('media ready fixture did not reach READY_TO_EDIT');
if(media.publishing_status!=='NOT_APPROVED_FOR_PUBLISHING') failures.push('media fixture should remain unapproved for publishing');

const reportOut=path.join(out,'report.md');
run('monthly report',[
  'workflows/monthly-report/index.mjs',
  `--out=${reportOut}`
]);
if(!fs.existsSync(reportOut)) failures.push('monthly report was not generated');

if(failures.length){
  console.error('Verification failed');
  for(const failure of failures) console.error(failure);
  process.exit(1);
}

console.log('All Crown & Core StarNet verification tests passed.');
