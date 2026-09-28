import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { resolveInside } from './lib/jail.mjs';

const required = ['CC_AGENT_ID','CC_COMPUTER_ID','CC_DISTRICT','CC_RUN_ID','CC_COMPUTER_ROOT','CC_REPO_ROOT','CC_TASK'];
for (const key of required) {
  if (!process.env[key]) {
    console.error(JSON.stringify({status:'FAILED',error:`missing ${key}`}));
    process.exit(2);
  }
}

const agentId = process.env.CC_AGENT_ID;
const computerId = process.env.CC_COMPUTER_ID;
const district = process.env.CC_DISTRICT;
const runId = process.env.CC_RUN_ID;
const task = process.env.CC_TASK;
const runtimeBackend = process.env.CC_RUNTIME_BACKEND || 'local-process';
const runtimeHostId = process.env.CC_RUNTIME_HOST_ID || process.env.HOSTNAME || null;
const computerRoot = path.resolve(process.env.CC_COMPUTER_ROOT);
const repoRoot = path.resolve(process.env.CC_REPO_ROOT);
const workspace = path.join(computerRoot,'workspace');
const receiptsDir = path.join(computerRoot,'receipts');

fs.mkdirSync(workspace,{recursive:true});
fs.mkdirSync(receiptsDir,{recursive:true});

function readRepoJson(...parts){
  return JSON.parse(fs.readFileSync(path.join(repoRoot,...parts),'utf8'));
}
function readRepoText(...parts){
  return fs.readFileSync(path.join(repoRoot,...parts),'utf8');
}
function assert(condition,message){
  if(!condition) throw new Error(message);
}

function executeDomainTask(){
  const state=()=>readRepoJson('data','current-state.json');
  switch(task){
    case 'orchestration-integrity': {
      const a=readRepoJson('runtime','agents.json');
      const c=readRepoJson('runtime','computers.json');
      const all=[a.manager,...a.agents];
      return {agent_count:all.length,computer_count:c.computers.length,one_to_one:new Set(all.map(x=>x.computer_id)).size===all.length};
    }
    case 'audit-booking-path':
      return {booking_path_verified:state().metrics.booking_path_verified,classification:state().metrics.booking_path_verified===null?'UNKNOWN':'MEASURED',mutation:false};
    case 'draft-service-funnel':
      return {artifact_type:'funnel_draft',mobile_first:true,direct_booking_path:true,live_change:false,approval_required:true};
    case 'analyze-dormant-segment':
      return {dormant_90d_plus:state().metrics.dormant_customers_90d_plus,eligibility_required:true,consent_required:true,outbound:false};
    case 'build-r3-draft': {
      const policy=readRepoText('districts','middleton','POLICY.md');
      assert(policy.includes('Do **not** implement review gating'),'review policy missing');
      return {review_gating:false,reward_depends_on_positive_rating:false,reward_depends_on_public_review:false,approval_required:true,outbound:false};
    }
    case 'design-feedback-flow':
      return {private_feedback:true,same_treatment_all_sentiment:true,optional_honest_review:true,reward_independent_of_review:true};
    case 'audit-reputation-state':
      return {google_review_flow_active:state().metrics.google_review_flow_active,review_count:null,rule:'do not fabricate current review count'};
    case 'audit-response-latency':
      return {median_lead_response_minutes:state().metrics.median_lead_response_minutes,classification:state().metrics.median_lead_response_minutes===null?'UNKNOWN':'MEASURED'};
    case 'draft-no-show-recovery':
      return {monthly_no_shows:state().metrics.monthly_no_shows,draft_only:true,approval_required:true,outbound:false};
    case 'audit-missed-calls':
      return {monthly_missed_calls:state().metrics.monthly_missed_calls,classification:state().metrics.monthly_missed_calls===null?'UNKNOWN':'MEASURED'};
    case 'draft-reception-flow':
      return {faq:true,human_escalation:true,clinical_claims:false,booking_mutation:false,approval_required_for_live:true};
    case 'draft-media-day':
      return {source_first:true,founder_interview:true,expert_interview:true,b_roll:true,podcast:true,publishing:false};
    case 'build-clip-manifest':
      return {timestamp_required:true,source_required:true,invented_claims:false,publishing:false};
    case 'audit-attribution':
      return {attribution_ready:state().metrics.attribution_ready,attributable_revenue:state().metrics.monthly_attributable_revenue,unknowns_preserved:true};
    case 'verify-receipts':
      return {done_requires_receipt:true,required_fields:['run_id','agent_id','computer_id','district','pid','started_at','ended_at','task_type','status','evidence']};
    case 'validate-canon-use': {
      const canon=readRepoJson('districts','middleton','canon','system.json');
      const last=canon.service_sequence?.at(-1)?.service || '';
      return {service_count:canon.service_sequence?.length || 0,paid_media_last:String(last).toLowerCase().includes('paid marketing'),policy_overrides_canon:true};
    }
    case 'validate-experiment-card': {
      const loop=readRepoText('districts','middleton','experiments','loop.md');
      return {
        approval_required:loop.includes('APPROVE'),
        metric_required:loop.includes('success_metric'),
        stop_required:loop.includes('stop_condition'),
        rollback_required:loop.includes('rollback')
      };
    }
    default:
      throw new Error(`unknown assigned task: ${task}`);
  }
}

const startedAt = new Date().toISOString();
const evidence = [];
let status='COMPLETED';
let error=null;
let result=null;

try {
  let traversalBlocked=false;
  try { resolveInside(workspace,'../escape.txt'); } catch { traversalBlocked=true; }
  if (!traversalBlocked) throw new Error('workspace traversal guard failed');
  evidence.push({type:'isolation_probe',passed:true});

  result=executeDomainTask();

  const artifactPath = resolveInside(workspace,`proof/${runId}.json`);
  fs.mkdirSync(path.dirname(artifactPath),{recursive:true});
  const artifact = {
    run_id:runId,
    agent_id:agentId,
    computer_id:computerId,
    district,
    pid:process.pid,
    cwd:process.cwd(),
    home:process.env.HOME || process.env.USERPROFILE || null,
    tmp:process.env.TMPDIR || process.env.TMP || null,
    task,
    runtime_backend:runtimeBackend,
    runtime_host_id:runtimeHostId,
    result
  };
  fs.writeFileSync(artifactPath,JSON.stringify(artifact,null,2)+'\n');
  const bytes=fs.readFileSync(artifactPath);
  const sha256=crypto.createHash('sha256').update(bytes).digest('hex');
  evidence.push({type:'artifact',path:path.relative(computerRoot,artifactPath),sha256,bytes:bytes.length});
  evidence.push({type:'domain_assertion',task,result});
} catch (e) {
  status='FAILED';
  error=String(e?.message || e);
}

const receipt={
  schema:'cc.run.receipt.v1',
  run_id:runId,
  agent_id:agentId,
  computer_id:computerId,
  district,
  pid:process.pid,
  started_at:startedAt,
  ended_at:new Date().toISOString(),
  task_type:task,
  runtime_backend:runtimeBackend,
  runtime_host_id:runtimeHostId,
  status,
  workspace:path.relative(computerRoot,workspace),
  evidence,
  error
};

const receiptPath=resolveInside(receiptsDir,`${runId}.json`);
fs.writeFileSync(receiptPath,JSON.stringify(receipt,null,2)+'\n');
process.stdout.write(JSON.stringify(receipt)+'\n');
process.exit(status==='COMPLETED'?0:1);
