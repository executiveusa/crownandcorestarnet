import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const root=process.cwd();
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cc-state-promotion-'));
const snapshotPath=path.join(dir,'snapshot.json');
const receiptPath=path.join(dir,'receipt.json');
const approvalPath=path.join(dir,'approval.json');
const statePath=path.join(dir,'state.json');
const outDir=path.join(root,'outbox');
fs.mkdirSync(outDir,{recursive:true});

const base={
  client:'crown-and-core',
  period:'baseline',
  metrics:{
    monthly_bookings:null,
    dormant_customers_90d_plus:null,
    monthly_attributable_revenue:null,
    booking_destination_verified:true
  },
  notes:[]
};
fs.writeFileSync(statePath,JSON.stringify(base,null,2)+'\n');

const snapshot={
  schema:'cc.square.state-snapshot.v1',
  source:'square',
  observed_at:'2026-09-30T05:00:00Z',
  provenance:'authenticated_read_only',
  synthetic:false,
  metrics:{
    monthly_bookings:23,
    dormant_customers_90d_plus:11,
    monthly_attributable_revenue:null,
    unknown_metric_should_not_apply:999
  },
  counts:{customers:100,bookings:50,orders:20},
  observed:{monthly_gross_order_total:1234.56},
  notes:[]
};
const raw=JSON.stringify(snapshot,null,2)+'\n';
fs.writeFileSync(snapshotPath,raw);
const sha=crypto.createHash('sha256').update(raw).digest('hex');
fs.writeFileSync(receiptPath,JSON.stringify({
  schema:'cc.connector-read-receipt.v1',
  connector:'square',
  mode:'authenticated_read_only',
  observed_at:snapshot.observed_at,
  snapshot_path:snapshotPath,
  snapshot_sha256:sha,
  customer_record_bodies_persisted:false,
  write_calls:0
},null,2)+'\n');

function run(extra=[]){
  return spawnSync(process.execPath,[
    'districts/management/stages/04_review/state-promotion/index.mjs',
    `--snapshot=${snapshotPath}`,
    `--receipt=${receiptPath}`,
    `--state=${statePath}`,
    ...extra
  ],{cwd:root,encoding:'utf8'});
}

const failures=[];
const before=fs.readFileSync(statePath,'utf8');
const dry=run();
if(dry.status!==0) failures.push('dry-run should succeed');
if(fs.readFileSync(statePath,'utf8')!==before) failures.push('dry-run modified state');
const candidate=JSON.parse(fs.readFileSync(path.join(outDir,'STATE-PROMOTION-CANDIDATE.json'),'utf8'));
if(candidate.changes.length!==2) failures.push('dry-run should include exactly two predeclared non-null metric changes');

const blocked=run(['--apply=true']);
if(blocked.status!==2) failures.push('apply without approval should block');

fs.writeFileSync(approvalPath,JSON.stringify({
  id:'TEST-STATE-APPROVAL',
  type:'state_promotion',
  approved:true,
  approved_by:'test-owner',
  approved_at:'2026-09-30T05:01:00Z',
  snapshot_sha256:sha
},null,2)+'\n');
const applied=run(['--apply=true',`--approval=${approvalPath}`]);
if(applied.status!==0) failures.push('approved apply should succeed');
const after=JSON.parse(fs.readFileSync(statePath,'utf8'));
if(after.metrics.monthly_bookings!==23) failures.push('monthly_bookings was not promoted');
if(after.metrics.dormant_customers_90d_plus!==11) failures.push('dormant metric was not promoted');
if('unknown_metric_should_not_apply' in after.metrics) failures.push('undeclared metric was promoted');
if(after.metrics.booking_destination_verified!==true) failures.push('existing metric was not preserved');
const promotionReceipt=JSON.parse(fs.readFileSync(path.join(outDir,'STATE-PROMOTION-RECEIPT.json'),'utf8'));
if(promotionReceipt.pii_written!==false) failures.push('promotion receipt must assert no PII written');

const badSnapshot={...snapshot,synthetic:true};
fs.writeFileSync(snapshotPath,JSON.stringify(badSnapshot,null,2)+'\n');
const badSha=crypto.createHash('sha256').update(fs.readFileSync(snapshotPath)).digest('hex');
fs.writeFileSync(receiptPath,JSON.stringify({mode:'authenticated_read_only',write_calls:0,snapshot_sha256:badSha},null,2)+'\n');
const synthetic=run();
if(synthetic.status!==2) failures.push('synthetic snapshot must be blocked');

if(failures.length){
  console.error('State promotion test FAILED');
  failures.forEach(x=>console.error('- '+x));
  process.exit(1);
}
console.log('State promotion test passed.');
