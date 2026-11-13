// Crown & Core -> Buffer Blaster v1, source-verified and no-spend.
// Buffer Blaster is the media/UGC plan ledger; StarNet alone owns the
// business outcome, clinical screening, source rights and owner authorization.
import { createHash } from 'node:crypto';
import { StudioError, TENANT } from './domain.mjs';

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const fail=(code,message,status=409)=>{throw new StudioError(code,message,status);};
function uuid(value,name){
  if(typeof value!=='string'||!UUID.test(value))
    fail('INVALID_UUID',name+' must be a canonical UUID.',400);
  return value.toLowerCase();
}
function validOrigin(raw){
  if(typeof raw!=='string'||!raw)throw new Error('CROWN_BUFFER_API_URL required.');
  const u=new URL(raw);
  const loopback=['localhost','127.0.0.1','[::1]','::1'].includes(u.hostname);
  if(u.username||u.password||u.hash||u.search||u.pathname!=='/'||
    (u.protocol!=='https:'&&!(u.protocol==='http:'&&loopback)))
    throw new Error('Buffer Blaster API must be HTTPS (or loopback HTTP), with no path, query or userinfo.');
  return u.origin;
}
const sha=value=>createHash('sha256').update(value).digest('hex');
const validHash=value=>typeof value==='string'&&/^[0-9a-f]{64}$/.test(value);
function current(item,now){
  if(item.tenant_id!==TENANT)fail('TENANT_DENIED','Only Crown & Core outcomes may be bridged.',403);
  if(item.status!=='RENDER_PLAN_READY' || item.render_plan?.version!==item.version)
    fail('NOT_READY','A current approved creative/render plan is required.');
  if(!item.source||item.source.source_type!=='facility'||!item.storyboard)
    fail('UNSUPPORTED_MEDIA','First pilot accepts only real facility sources, not synthetic testimonials.');
  if(item.approvals?.owner?.version!==item.version||
    item.approvals?.clinical?.version!==item.version)
    fail('NOT_APPROVED','Owner and independent clinical screening are required.');
  const rights=item.rights_verification;
  if(!rights||rights.version!==item.version||rights.revoked||
    !validHash(rights.asset_sha256)||!validHash(rights.grant_sha256)||
    Date.parse(rights.expires_at)<=now())
    fail('RIGHTS_NOT_VERIFIED','Verified current source rights and hashes required.');
  if(item.source.rights_ref!==rights.rights_ref)
    fail('RIGHTS_MISMATCH','Current source rights do not match verified grant.');
  return rights;
}
function ensurePlanMatches(response,expected,workspace){
  const plan=response?.plan;
  if(response?.ok!==true||response.paid_generation!==false||
    !plan||uuid(plan.workspace_id,'workspace_id')!==workspace ||
    plan.idempotency_key!==expected.idempotency_key ||
    plan.duration_seconds!==30 || plan.aspect_ratio!=='9:16' ||
    plan.approval_state!=='draft' ||plan.estimated_cost_ceiling_cents!==0 ||
    plan.metadata?.outcome_id!==expected.metadata.outcome_id ||
    plan.metadata?.source_version!==expected.metadata.source_version ||
    plan.metadata?.tenant_id!==TENANT ||
    JSON.stringify(plan.product_source_refs)!==JSON.stringify(expected.product_source_refs))
    fail('BUFFER_CONTRACT_DRIFT','Buffer Blaster plan response does not match Crown & Core v1 contract.',502);
  uuid(plan.plan_id,'plan_id');
  if(response.backend!=='supabase')fail('NONCANONICAL_BUFFER_BACKEND','Buffer Blaster must persist plans in its canonical Supabase ledger.',502);
  return plan;
}
export function createBufferBlasterClient({baseUrl,token,workspaceId,fetchFn=fetch,timeoutMs=10000}={}){
  const base=validOrigin(baseUrl),workspace=uuid(workspaceId,'workspaceId');
  if(typeof token!=='string'||token.length<24)throw new Error('Private Buffer Blaster operator key (24+ characters) required.');
  async function call(method,path,body){
    if(!/^\/api\/[a-z0-9/_-]+$/i.test(path))throw new Error('Unexpected Buffer Blaster API route.');
    const response=await fetchFn(base+path,{method,redirect:'error',signal:AbortSignal.timeout(timeoutMs),
      headers:{authorization:'Bearer '+token,accept:'application/json',
        ...(method==='POST'?{'content-type':'application/json'}:{})},
      ...(method==='POST'?{body:JSON.stringify(body)}:{})});
    if(!response.ok)fail('BUFFER_HTTP_ERROR','Buffer Blaster returned '+response.status,502);
    const raw=await response.text();
    if(raw.length>131072)fail('BUFFER_RESPONSE_TOO_LARGE','Buffer Blaster response exceeds 128 KiB.',502);
    try{return JSON.parse(raw);}catch{fail('BUFFER_INVALID_RESPONSE','Buffer Blaster returned invalid JSON.',502);}
  }
  return {
    workspaceId:workspace,
    async status(){
      const health=await call('GET','/api/health');
      if(health?.status!=='ok'||health.approval_gate!==true||typeof health.version!=='string')
        fail('BUFFER_HEALTH_UNVERIFIED','Buffer Blaster identity/approval gate not confirmed.',502);
      const studio=await call('GET','/api/studio/status');
      if(studio?.ok!==true||studio.approval_gate!==true)
        fail('BUFFER_AUTH_UNVERIFIED','Authenticated Buffer Blaster Studio status unavailable.',502);
      return {connected:true,version:health.version,approval_gate:true,
        media_configured:health.media_configured===true,
        storage_configured:health.storage_configured===true,
        ledger_backend:studio.ledger?.backend??'unknown',
        // No claims of live 30s/15s support: its existing ad factory has 10s+10s semantics.
        crown_30_15_render_supported:false,paid_execution_enabled:false};
    },
    async tools(){
      const message={jsonrpc:'2.0',id:1,method:'tools/list',params:{}};
      const result=await call('POST','/api/mcp',message);
      if(result?.jsonrpc!=='2.0'||result.id!==1||!Array.isArray(result.result?.tools))
        fail('BUFFER_MCP_UNVERIFIED','Authenticated MCP tool catalog unavailable.',502);
      return {transport:'http-json-rpc',tools:result.result.tools.map(t=>t.name),
        arbitrary_tool_calls_enabled:false};
    },
    async reference(sourceId){
      const referenceId=uuid(sourceId,'sourceId');
      const response=await call('GET','/api/studio/references/'+referenceId);
      if(response?.ok!==true||uuid(response.workspace_id,'workspace')!==workspace||
        uuid(response.asset?.id,'source asset')!==referenceId||
        uuid(response.asset?.workspace_id,'asset workspace')!==workspace)
        fail('BUFFER_REFERENCE_DENIED','Referenced media is not verified in the configured Buffer Blaster workspace.',403);
      if(!['uploaded_reference','source_video','brand_asset'].includes(response.asset.kind))
        fail('BUFFER_UNSAFE_SOURCE','Only uploaded or private source-media references are eligible.',403);
      return {source_id:referenceId,workspace_id:workspace,kind:response.asset.kind,
        rights_verified:false};
    },
    async createPlan(draft){
      if(draft?.approval_state!=='draft'||draft?.estimated_cost_ceiling_cents!==0)
        fail('BUFFER_PAID_DENIED','Only zero-cost draft plans may be created.',403);
      const response=await call('POST','/api/studio/ugc/plans',draft);
      return {plan:ensurePlanMatches(response,draft,workspace),backend:response.backend,
        created:response.created===true,idempotent_replay:response.idempotent_replay===true,
        paid_generation:false};
    },
    async readPlan(planId,expected){
      const plan_id=uuid(planId,'planId');
      const response=await call('GET','/api/studio/ugc/plans/'+plan_id);
      if(response?.ok!==true||uuid(response.plan?.plan_id,'plan_id')!==plan_id)
        fail('BUFFER_PLAN_NOT_FOUND','Plan readback failed.',502);
      ensurePlanMatches(response,expected,workspace);
      return {plan_id,backend:response.backend,readback_verified:true,paid_generation:false};
    }
  };
}
export function createBufferLink(studio,client,{now=()=>Date.now()}={}){
  if(typeof studio?.applyTrusted!=='function'||!client)throw new Error('Studio and Buffer Blaster client required.');
  async function bindSource(id,{version,source_uuid}={},role='rights'){
    if(role!=='rights')fail('FORBIDDEN','Only the independent rights service can bind assets.',403);
    const item=studio.get(id),rights=current(item,now);
    if(version!==item.version)fail('STALE_VERSION','Use current revision.');
    const sourceId=uuid(source_uuid,'source_uuid');
    await client.reference(sourceId); // real readback, not an agent-provided workspace claim
    return studio.applyTrusted(id,(record,receipt)=>{
      current(record,now);
      if(record.version!==version)fail('STALE_VERSION','Revision changed while verifying source.');
      if(record.buffer_blaster?.source_uuid&&record.buffer_blaster.source_uuid!==sourceId)
        fail('SOURCE_ALREADY_BOUND','A different source is already bound; revise outcome.');
      record.buffer_blaster={source_uuid:sourceId,source_sha256:rights.asset_sha256,
        workspace_id:client.workspaceId,version,plan:null};
      receipt('buffer_source_bound_workspace_verified','rights');
    });
  }
  function draftFor(item){
    const rights=current(item,now);
    const b=item.buffer_blaster;
    if(!b||b.version!==item.version||b.workspace_id!==client.workspaceId||
      b.source_sha256!==rights.asset_sha256)
      fail('BUFFER_SOURCE_NOT_BOUND','Trusted rights service must bind exact workspace source first.');
    const story=item.storyboard,sourceId=uuid(b.source_uuid,'bound source');
    const key='cc_'+sha([item.id,item.version,sourceId,rights.grant_sha256].join(':')).slice(0,48);
    return {product_source_refs:[sourceId],script:[story.hook,story.story,story.cta].join('\n'),
      shot_plan:[{beat:'hook',text:story.hook,source_ref:sourceId},
        {beat:'story',text:story.story,source_ref:sourceId},
        {beat:'cta',text:story.cta,source_ref:sourceId}],
      aspect_ratio:'9:16',duration_seconds:30,finish_mode:'editorial_brand',
      provider_preference:'auto',estimated_cost_ceiling_cents:0,
      approval_state:'draft',consent_rights_refs:[rights.rights_ref,rights.grant_ref],
      idempotency_key:key,metadata:{source_system:'crown-core-starnet',
        tenant_id:TENANT,outcome_id:item.id,source_version:item.version,
        source_asset_sha256:rights.asset_sha256,rights_grant_sha256:rights.grant_sha256,
        requested_cuts_seconds:[30,15],clinical_screening_verified:true,
        rendering_enabled:false,publishing_enabled:false}};
  }
  async function syncPlan(id,role='agent'){
    if(!['agent','operator'].includes(role))fail('FORBIDDEN','Agent or operator role required.',403);
    const item=studio.get(id),draft=draftFor(item);
    if(item.buffer_blaster?.plan){
      const verified=await client.readPlan(item.buffer_blaster.plan.plan_id,draft);
      return {outcome:studio.get(id),external:{...verified,created:false}};
    }
    const result=await client.createPlan(draft);
    // Provider is canonical for its plan. StarNet holds a minimal projection/receipt.
    const readback=await client.readPlan(result.plan.plan_id,draft);
    const updated=studio.applyTrusted(id,(record,receipt)=>{
      const currentDraft=draftFor(record);
      if(currentDraft.idempotency_key!==draft.idempotency_key)
        fail('STALE_VERSION','Creative changed while syncing provider plan.');
      record.buffer_blaster.plan={plan_id:readback.plan_id,workspace_id:client.workspaceId,
        version:record.version,idempotency_key:draft.idempotency_key,
        backend:readback.backend,paid_generation:false,status:'DRAFT_NOT_RENDERED'};
      receipt('buffer_plan_synced_no_spend','agent');
    });
    return {outcome:updated,external:{...readback,created:result.created}};
  }
  return {bindSource,syncPlan,draftFor};
}
