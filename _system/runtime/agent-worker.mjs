import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { resolveInside } from './lib/jail.mjs';
import { runModel } from './model/index.mjs';
import { parseAgentAnalysis } from './model/protocol.mjs';
import { buildContextBundle } from './lib/context-bundle.mjs';

const required = ['CC_AGENT_ID','CC_COMPUTER_ID','CC_DISTRICT','CC_RUN_ID','CC_COMPUTER_ROOT','CC_REPO_ROOT','CC_TASK','CC_PROMPT_PATH'];
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
const promptRel = process.env.CC_PROMPT_PATH;
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

function readRuntimeHandoff(){
  const rel=process.env.CC_RUNTIME_HANDOFF_REL;
  if(!rel) return null;
  if(!rel.startsWith('.runtime/handoffs/')) throw new Error('runtime handoff path outside allowed prefix');
  const handoff=readRepoJson(...rel.split('/'));
  return handoff;
}

function executeDomainTask(){
  const state=()=>readRepoJson('_shared','state','current-state.json');
  switch(task){
    case 'orchestration-integrity': {
      const a=readRepoJson('_system','runtime','agents.json');
      const computers=readRepoJson('_system','runtime','computers.json');
      const all=[a.manager,...a.agents];
      const handoff=readRuntimeHandoff();
      return {
        agent_count:all.length,
        computer_count:computers.computers.length,
        one_to_one:new Set(all.map(x=>x.computer_id)).size===all.length,
        phased_handoff_present:handoff!==null,
        upstream_phases_verified:handoff?.upstream_phases_verified ?? null,
        upstream_failed_jobs:handoff?.failed_jobs ?? null
      };
    }
    case 'audit-booking-path': {      const pub=readRepoJson('_shared','evidence','public-web-2026-09-28.json');      const gapIds=(pub.observed_gaps||[]).map(x=>x.id);      return {        booking_path_verified:state().metrics.booking_path_verified,        booking_cta_present:pub.verified_public_facts.booking_cta_present,        booking_destination_verified:!gapIds.includes('booking-destination-unverified'),        public_conversion_gaps:gapIds.filter(x=>['hours-conflict','about-placeholders','event-price-placeholder','faq-content-mismatch','booking-destination-unverified'].includes(x)),        mutation:false      };    }
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
    case 'audit-reputation-state': {      const pub=readRepoJson('_shared','evidence','public-web-2026-09-28.json');      return {        google_review_flow_active:state().metrics.google_review_flow_active,        public_listing_observation:pub.verified_public_facts.public_listing_observation,        rule:'Do not relabel a generic public listing observation as a platform-specific review count without platform verification.'      };    }
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
    case 'audit-attribution': {
      const handoff=readRuntimeHandoff();
      return {
        attribution_ready:state().metrics.attribution_ready,
        attributable_revenue:state().metrics.monthly_attributable_revenue,
        unknowns_preserved:true,
        worker_handoff_present:handoff!==null,
        worker_jobs_verified:handoff?.verified_jobs ?? null
      };
    }
    case 'verify-receipts': {
      const handoff=readRuntimeHandoff();
      const jobs=handoff?.jobs || [];
      const required=['run_id','agent_id','computer_id','district','task_type','status','evidence'];
      if(handoff===null){
        return {
          done_requires_receipt:true,
          phased_handoff_present:false,
          audit_mode:'contract_only',
          audited_jobs:0,
          all_upstream_receipts_verified:null,
          required_fields:required
        };
      }
      const malformed=jobs.filter(j=>required.some(k=>j[k]===undefined||j[k]===null));
      const invalid=jobs.filter(j=>j.status!=='VERIFIED'||j.receipt?.status!=='COMPLETED');
      const hashFailures=jobs.filter(j=>{
        if(!j.receipt||!j.receipt_sha256) return true;
        const raw=JSON.stringify(j.receipt,null,2)+'\n';
        return crypto.createHash('sha256').update(raw).digest('hex')!==j.receipt_sha256;
      });
      const artifactMissing=jobs.filter(j=>!j.artifact_sha256||!j.evidence?.some(e=>e.type==='artifact'&&e.sha256===j.artifact_sha256));
      assert(jobs.length>0,'receipt-verifier received empty worker handoff');
      assert(malformed.length===0,'worker handoff contains malformed receipt summaries');
      assert(invalid.length===0,'worker handoff contains unverified jobs');
      assert(hashFailures.length===0,'worker handoff receipt hash verification failed');
      assert(artifactMissing.length===0,'worker handoff missing artifact hash evidence');
      return {
        done_requires_receipt:true,
        phased_handoff_present:true,
        audit_mode:'upstream_receipts',
        handoff_schema:handoff.schema,
        audited_jobs:jobs.length,
        malformed_jobs:malformed.length,
        unverified_jobs:invalid.length,
        receipt_hash_failures:hashFailures.length,
        missing_artifact_hashes:artifactMissing.length,
        all_upstream_receipts_verified:malformed.length===0&&invalid.length===0&&hashFailures.length===0&&artifactMissing.length===0,
        required_fields:required
      };
    }
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

if (runtimeBackend.startsWith('docker')) {
  const manifestPath = process.env.CC_SCOPE_MANIFEST;
  const expectedScopeSha = process.env.CC_SCOPE_SHA256;
  if (!manifestPath || !expectedScopeSha) {
    console.error(JSON.stringify({status:'FAILED',error:'docker scope manifest metadata missing'}));
    process.exit(2);
  }
  const rawScope = fs.readFileSync(manifestPath);
  const actualScopeSha = crypto.createHash('sha256').update(rawScope).digest('hex');
  const scope = JSON.parse(rawScope.toString('utf8'));
  if (actualScopeSha !== expectedScopeSha) {
    console.error(JSON.stringify({status:'FAILED',error:'scope manifest hash mismatch'}));
    process.exit(2);
  }
  if (scope.agent_id !== agentId || scope.district !== district) {
    console.error(JSON.stringify({status:'FAILED',error:'scope manifest identity mismatch'}));
    process.exit(2);
  }
  const foreignDistricts = (scope.files || [])
    .map(x => String(x.path || ''))
    .filter(x => x.startsWith('districts/'))
    .map(x => x.split('/')[1])
    .filter(x => x && x !== district && x !== 'middleton');

  const districtsRoot = path.join(repoRoot, 'districts');
  const physicalDistricts = fs.existsSync(districtsRoot)
    ? fs.readdirSync(districtsRoot, { withFileTypes:true }).filter(x=>x.isDirectory()).map(x=>x.name)
    : [];
  const unauthorizedPhysicalDistricts = physicalDistricts.filter(x => x !== district && x !== 'middleton');
  const wholeRepositoryVisible = fs.existsSync(path.join(repoRoot,'.git')) || fs.existsSync(path.join(repoRoot,'package.json'));

  evidence.push({
    type:'scope_probe',
    passed:foreignDistricts.length===0 && unauthorizedPhysicalDistricts.length===0 && !wholeRepositoryVisible,
    scope_sha256:actualScopeSha,
    file_count:(scope.files || []).length,
    explicit_paths:scope.explicit_paths || [],
    physical_districts:physicalDistricts,
    whole_repository_visible:wholeRepositoryVisible,
    cross_district_policy_grants:[...new Set(
      (scope.files || [])
        .map(x => String(x.path || ''))
        .filter(x => x.startsWith('districts/middleton/') && district !== 'middleton')
    )]
  });
  if (foreignDistricts.length || unauthorizedPhysicalDistricts.length || wholeRepositoryVisible) {
    console.error(JSON.stringify({status:'FAILED',error:'agent input scope isolation failed'}));
    process.exit(2);
  }
}

let status='COMPLETED';
let error=null;
let result=null;
let verificationTier='structural';

try {
  let traversalBlocked=false;
  try { resolveInside(workspace,'../escape.txt'); } catch { traversalBlocked=true; }
  if (!traversalBlocked) throw new Error('workspace traversal guard failed');
  evidence.push({type:'isolation_probe',passed:true});

  const promptPath=path.join(repoRoot,...promptRel.split('/'));
  if(!fs.existsSync(promptPath)) throw new Error('agent prompt contract missing');
  const systemPrompt=fs.readFileSync(promptPath,'utf8');

  const contextBundle=buildContextBundle({
    repoRoot,
    district,
    agentId,
    promptRel,
    scopeManifestPath:process.env.CC_SCOPE_MANIFEST||null
  });
  if(!contextBundle.files.length) throw new Error('agent context bundle is empty');

  const modelResult=await runModel({
    agent:{id:agentId,district,computer_id:computerId},
    task,
    system:systemPrompt,
    context:contextBundle.text
  });
  const parsedAnalysis=parseAgentAnalysis(modelResult.content);
  const trustLevel=process.env.CC_MODEL_TRUST_LEVEL || (modelResult.external===true?'untrusted_external':'fixture');
  verificationTier=(modelResult.external===true && parsedAnalysis.valid===true)
    ? (trustLevel==='live'?'operational':'gateway')
    : 'structural';

  evidence.push({
    type:'context_bundle',
    sha256:contextBundle.sha256,
    chars:contextBundle.chars,
    file_count:contextBundle.files.length,
    files:contextBundle.files,
    scope_sha256:contextBundle.scope_sha256
  });
  evidence.push({
    type:'model_run',
    provider:modelResult.provider,
    model:modelResult.model,
    external:modelResult.external,
    structured_output:parsedAnalysis.valid,
    structured_error:parsedAnalysis.error,
    trust_level:trustLevel,
    business_analysis_verified:verificationTier==='operational',
    response_sha256:crypto.createHash('sha256').update(String(modelResult.content||'')).digest('hex')
  });

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
    verification_tier:verificationTier,
    model_analysis:parsedAnalysis.valid?parsedAnalysis.analysis:null,
    deterministic_result:result,
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
  verification_tier:verificationTier,
  business_output_verified:verificationTier==='operational',
  workspace:path.relative(computerRoot,workspace),
  evidence,
  error
};

const receiptPath=resolveInside(receiptsDir,`${runId}.json`);
fs.writeFileSync(receiptPath,JSON.stringify(receipt,null,2)+'\n');
process.stdout.write(JSON.stringify(receipt)+'\n');
process.exit(status==='COMPLETED'?0:1);
