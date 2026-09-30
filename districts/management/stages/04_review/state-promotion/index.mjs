import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root=process.cwd();
const args=Object.fromEntries(process.argv.slice(2).map(x=>{
  const i=x.indexOf('=');
  return i>0?[x.slice(2,i),x.slice(i+1)]:[x.replace(/^--/,''),'true'];
}));
const snapshotPath=path.resolve(root,args.snapshot||'outbox/LIVE-SQUARE-SNAPSHOT.json');
const receiptPath=path.resolve(root,args.receipt||'outbox/LIVE-SQUARE-SNAPSHOT.receipt.json');
const approvalPath=args.approval?path.resolve(root,args.approval):null;
const statePath=path.resolve(root,args.state||'_shared/state/current-state.json');
const apply=args.apply==='true';

function readJson(p){ return JSON.parse(fs.readFileSync(p,'utf8')); }
function hashFile(p){ return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'); }

for(const p of [snapshotPath,receiptPath,statePath]){
  if(!fs.existsSync(p)) throw new Error('missing required file: '+path.relative(root,p));
}

const snapshot=readJson(snapshotPath);
const receipt=readJson(receiptPath);
const state=readJson(statePath);
const failures=[];

if(snapshot.provenance!=='authenticated_read_only') failures.push('snapshot provenance is not authenticated_read_only');
if(snapshot.synthetic===true) failures.push('synthetic snapshot may never be promoted');
if(receipt.mode!=='authenticated_read_only') failures.push('receipt mode is not authenticated_read_only');
if(receipt.write_calls!==0) failures.push('connector receipt reports write calls');
const actualHash=hashFile(snapshotPath);
if(receipt.snapshot_sha256!==actualHash) failures.push('snapshot hash does not match connector receipt');

let approval=null;
if(apply){
  if(!approvalPath || !fs.existsSync(approvalPath)) failures.push('apply requires --approval=<file>');
  else {
    approval=readJson(approvalPath);
    if(approval.type!=='state_promotion') failures.push('approval type must be state_promotion');
    if(approval.approved!==true) failures.push('state promotion is not approved');
    if(!approval.approved_by) failures.push('approval missing approved_by');
    if(!approval.approved_at) failures.push('approval missing approved_at');
    if(approval.snapshot_sha256!==actualHash) failures.push('approval is not bound to this snapshot hash');
  }
}

if(failures.length){
  console.error('State promotion BLOCKED');
  failures.forEach(x=>console.error('- '+x));
  process.exit(2);
}

const candidate=structuredClone(state);
candidate.period='live-observed';
candidate.last_authenticated_observation_at=snapshot.observed_at;
candidate.provenance={
  source:snapshot.source,
  snapshot_sha256:actualHash,
  promoted_at:apply?new Date().toISOString():null,
  approval_id:approval?.id||null
};

const changes=[];
for(const [key,value] of Object.entries(snapshot.metrics||{})){
  if(value===null || value===undefined) continue;
  if(!(key in candidate.metrics)) continue;
  const before=candidate.metrics[key];
  candidate.metrics[key]=value;
  changes.push({metric:key,before,after:value});
}

const dryRun={
  schema:'cc.state-promotion-candidate.v1',
  apply,
  source:snapshot.source,
  snapshot_sha256:actualHash,
  changes,
  candidate_state:candidate
};
const candidatePath=path.join(root,'outbox','STATE-PROMOTION-CANDIDATE.json');
fs.mkdirSync(path.dirname(candidatePath),{recursive:true});
fs.writeFileSync(candidatePath,JSON.stringify(dryRun,null,2)+'\n');

if(!apply){
  console.log(`State promotion dry-run: ${changes.length} metric change(s). No state file modified.`);
  process.exit(0);
}

fs.writeFileSync(statePath,JSON.stringify(candidate,null,2)+'\n');
const stateHash=hashFile(statePath);
const promotionReceipt={
  schema:'cc.state-promotion-receipt.v1',
  id:approval.id,
  approved_by:approval.approved_by,
  approved_at:approval.approved_at,
  applied_at:new Date().toISOString(),
  source:snapshot.source,
  snapshot_sha256:actualHash,
  resulting_state_sha256:stateHash,
  changes,
  pii_written:false
};
fs.writeFileSync(path.join(root,'outbox','STATE-PROMOTION-RECEIPT.json'),JSON.stringify(promotionReceipt,null,2)+'\n');
console.log(`State promotion APPLIED: ${changes.length} metric change(s).`);
console.log(`Resulting state SHA-256: ${stateHash}`);
