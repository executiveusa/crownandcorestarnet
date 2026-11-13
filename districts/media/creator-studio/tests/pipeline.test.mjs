import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createStudio, StudioError } from '../src/domain.mjs';
import { createPipeline } from '../src/pipeline.mjs';
import { sqliteStore } from '../src/sqlite-store.mjs';
import { createRendererAdapter, createOrganicPublisher } from '../src/adapters.mjs';
import { inspectVideoCuts } from '../src/qa.mjs';
import { createApiServer } from '../src/api.mjs';

const at='2026-11-12T20:00:00Z',until='2026-11-13T20:00:00Z';
const a='a'.repeat(64),b='b'.repeat(64),c='c'.repeat(64);
const future=()=>new Date(Date.now()+3600000).toISOString();
const rejected=(fn,code)=>assert.throws(fn,e=>e instanceof StudioError&&e.code===code);
function draft(){
  const studio=createStudio({now:()=>at,uuid:(()=>{let n=0;return()=> 'test-'+(++n);})()});
  const pipeline=createPipeline(studio,{now:()=>at});
  const item=studio.create({outcome:'Produce a genuine Crown & Core introduction film',goal:'owned_media'});
  const id=item.id;
  studio.registerSource(id,{source_type:'facility',source_ref:'asset:real',rights_ref:'rights:one',usage_scope:'both'});
  studio.proposeStoryboard(id,{hook:'Welcome',story:'Real licensed footage of the space',
    cta:'Explore Crown & Core',claims_present:false,disclosure_present:false});
  const review=studio.requestReview(id);
  studio.decide(id,'owner',{version:review.version,decision:'approve',rights_confirmed:true});
  studio.decide(id,'clinical',{version:review.version,decision:'approve',claim_ref:'claim:screened'});
  studio.prepareRenderPlan(id,{provider:'montage',idempotency_key:'job:one',max_cost_usd:5});
  return {studio,pipeline,id,version:review.version};
}
function ready(){
  const f=draft();
  f.pipeline.verifyRights(f.id,'rights',{version:f.version,rights_ref:'rights:one',
    grant_ref:'grant:verified',grant_sha256:c,asset_sha256:a,scope:'both',
    revoked:false,expires_at:until});
  f.pipeline.authorizeRender(f.id,'owner',{version:f.version,max_cost_usd:5,
    decision_ref:'decision:render',expires_at:until});
  return f;
}
function rendered(){
  const f=ready();
  const job_id=f.studio.get(f.id).render_plan.job_id;
  f.pipeline.reserveDispatch(f.id,'operator',{version:f.version,job_id});
  f.pipeline.acknowledgeProvider(f.id,'operator',{version:f.version,job_id,
    provider_job_id:'provider:job1',accepted:true});
  f.pipeline.providerResult(f.id,'operator',{version:f.version,job_id,
    provider_job_id:'provider:job1',status:'rendered',cost_actual_usd:3,
    provider_receipt_ref:'receipt:provider',
    artifacts:[{cut_seconds:30,artifact_ref:'artifact:30',sha256:a},
      {cut_seconds:15,artifact_ref:'artifact:15',sha256:b}]});
  return {...f,job_id};
}
function verified(){
  const f=rendered();
  f.pipeline.verifyQa(f.id,'qa',{version:f.version,job_id:f.job_id,verified:true,
    qa_ref:'qa:one',cuts:[
      {cut_seconds:30,artifact_ref:'artifact:30',sha256:a,width:1080,height:1920,duration_seconds:30,size_bytes:2000},
      {cut_seconds:15,artifact_ref:'artifact:15',sha256:b,width:1080,height:1920,duration_seconds:15,size_bytes:2000}
    ]});
  return f;
}
test('full approved film to separately authorized organic post with source-backed metrics',()=>{
  const f=verified();
  rejected(()=>f.pipeline.published(f.id,'publisher',{}),'INVALID_STATE');
  rejected(()=>f.pipeline.decideFinal(f.id,'operator',{version:f.version,decision:'approve',hash_30:a,hash_15:b,decision_ref:'decision:film'}),'FORBIDDEN');
  rejected(()=>f.pipeline.decideFinal(f.id,'owner',{version:f.version,decision:'approve',hash_30:c,hash_15:b,decision_ref:'decision:film'}),'STALE_ARTIFACT');
  f.pipeline.decideFinal(f.id,'owner',{version:f.version,decision:'approve',hash_30:a,hash_15:b,decision_ref:'decision:film'});
  assert.equal(f.studio.summary(f.id).verified_video,true);
  assert.equal(f.studio.summary(f.id).published,false);
  f.pipeline.authorizePublish(f.id,'owner',{version:f.version,channel:'instagram_reel',
    booking_path_verified:true,claim_policy_verified:true,
    decision_ref:'decision:publish',expires_at:until});
  f.pipeline.reservePublication(f.id,'publisher',{version:f.version,decision_ref:'decision:publish'});
  rejected(()=>f.pipeline.published(f.id,'publisher',{version:f.version,channel:'instagram_reel',
    published_hash:c,external_post_ref:'post:one',publication_receipt_ref:'receipt:post'}),'PUBLICATION_MISMATCH');
  f.pipeline.published(f.id,'publisher',{version:f.version,channel:'instagram_reel',
    published_hash:a,external_post_ref:'post:one',publication_receipt_ref:'receipt:post'});
  assert.equal(f.studio.summary(f.id).published,true);
  assert.equal(f.studio.summary(f.id).attributed_bookings,null);
  rejected(()=>f.pipeline.attribute(f.id,'operator',{version:f.version,verified_source:false,
    source_ref:'event:source',event_ref:'event:one',bookings:3,revenue_usd:100}),'UNVERIFIED_METRICS');
  f.pipeline.attribute(f.id,'operator',{version:f.version,verified_source:true,
    source_ref:'event:source',event_ref:'event:one',bookings:3,revenue_usd:100});
  assert.equal(f.studio.summary(f.id).attributed_bookings,3);
  assert.equal(f.studio.summary(f.id).attributed_revenue,100);
  assert.equal(f.studio.get(f.id).render_plan.paid_spend_enabled,false);
});
test('rights and capped spending cannot be bypassed',()=>{
  const f=draft();
  rejected(()=>f.pipeline.authorizeRender(f.id,'owner',{version:f.version,max_cost_usd:1,
    decision_ref:'decision:one',expires_at:until}),'RIGHTS_NOT_VERIFIED');
  rejected(()=>f.pipeline.verifyRights(f.id,'agent',{version:f.version,rights_ref:'rights:one',
    grant_ref:'grant:one',grant_sha256:c,asset_sha256:a,scope:'both',
    revoked:false,expires_at:until}),'FORBIDDEN');
  rejected(()=>f.pipeline.verifyRights(f.id,'rights',{version:f.version,rights_ref:'rights:one',
    grant_ref:'grant:one',grant_sha256:c,asset_sha256:a,scope:'both',
    revoked:true,expires_at:until}),'RIGHTS_REVOKED');
  f.pipeline.verifyRights(f.id,'rights',{version:f.version,rights_ref:'rights:one',
    grant_ref:'grant:one',grant_sha256:c,asset_sha256:a,scope:'both',
    revoked:false,expires_at:until});
  rejected(()=>f.pipeline.authorizeRender(f.id,'owner',{version:f.version,max_cost_usd:10,
    decision_ref:'decision:one',expires_at:until}),'INVALID_BUDGET');
  rejected(()=>f.pipeline.authorizeRender(f.id,'owner',{version:f.version-1,max_cost_usd:1,
    decision_ref:'decision:one',expires_at:until}),'STALE_VERSION');
});
test('provider job IDs, QA hashes, final approval and booking policy fail closed',()=>{
  const f=rendered();
  rejected(()=>f.pipeline.verifyQa(f.id,'qa',{version:f.version,job_id:f.job_id,verified:true,
    qa_ref:'qa:one',cuts:[{cut_seconds:30,artifact_ref:'artifact:30',sha256:c,
      width:1080,height:1920,duration_seconds:30,size_bytes:2000},
      {cut_seconds:15,artifact_ref:'artifact:15',sha256:b,
      width:1080,height:1920,duration_seconds:15,size_bytes:2000}]}),'QA_FAILED');
  const q=verified();
  q.pipeline.decideFinal(q.id,'owner',{version:q.version,decision:'approve',hash_30:a,hash_15:b,decision_ref:'decision:film'});
  rejected(()=>q.pipeline.authorizePublish(q.id,'owner',{version:q.version,channel:'facebook_reel',
    booking_path_verified:true,claim_policy_verified:true,decision_ref:'decision:post',expires_at:until}),'CHANNEL_MISMATCH');
  const booking=draft();
  assert.equal(booking.studio.get(booking.id).status,'RENDER_PLAN_READY');
});
test('creative revision is blocked after render authorization to protect external receipts',()=>{
  const f=verified();
  assert.equal(f.studio.get(f.id).status,'READY_FOR_FINAL_REVIEW');
  rejected(()=>f.studio.proposeStoryboard(f.id,{hook:'Another',story:'Revised',
    cta:'Explore',claims_present:false,disclosure_present:false}),'EXTERNAL_OPERATION_PENDING');
  rejected(()=>f.studio.registerSource(f.id,{source_type:'facility',source_ref:'asset:other',
    rights_ref:'rights:other',usage_scope:'both'}),'EXTERNAL_OPERATION_PENDING');
  assert.equal(f.studio.get(f.id).render_authorization.version,f.version);
});

test('SQLite survives restart, enforces append-only chain, and handles multiple outcomes',()=>{
  const dir=mkdtempSync(join(tmpdir(),'cc-studio-sqlite-'));
  try{
    const filename=join(dir,'private.sqlite');
    let store=sqliteStore(filename);
    let studio=createStudio(store);
    const first=studio.create({outcome:'Crown & Core film one'});
    const second=studio.create({outcome:'Crown & Core film two'});
    studio.registerSource(first.id,{source_type:'facility',source_ref:'asset:one',
      rights_ref:'rights:one',usage_scope:'both'});
    store.close();
    store=sqliteStore(filename);
    assert.equal(store.initial.length,2);
    studio=createStudio(store);
    assert.equal(studio.get(first.id).receipts.length,2);
    assert.equal(studio.get(second.id).receipts.length,1);
    studio.proposeStoryboard(first.id,{hook:'Hello',story:'A real place',cta:'Visit',
      claims_present:false,disclosure_present:false});
    store.close();
  }finally{rmSync(dir,{recursive:true,force:true});}
});
test('renderer adapter checks real health and submits exact authorized payload once',async()=>{
  const calls=[];
  const fake=async(url,opts)=>{
    calls.push({url,opts});
    return {ok:true,headers:{get:()=>null},text:async()=>JSON.stringify(
      opts.method==='GET'?{version:'verified-deployment-1'}:{accepted:true,provider_job_id:'provider:one'})};
  };
  const adapter=createRendererAdapter({healthUrl:'https://render.example.test/health',
    submitUrl:'https://render.example.test/jobs',token:'x'.repeat(30),fetchFn:fake});
  assert.equal((await adapter.inspect()).version,'verified-deployment-1');
  const plan={job_id:'job:one',tenant_id:'crown-and-core',status:'DISPATCH_RESERVED',
    version:3,provider:'montage',outcome_id:'outcome:one',source_refs:['asset:one'],
    rights_refs:['rights:one'],claim_refs:[],dimensions:{width:1080,height:1920},
    cuts_seconds:[30,15],max_cost_usd:5,idempotency_key:'key:one'};
  const auth={job_id:'job:one',version:3,max_cost_usd:3,expires_at:future()};
  const rights={version:3,revoked:false,expires_at:future()};
  const result=await adapter.submit(plan,auth,rights);
  assert.equal(result.provider_job_id,'provider:one');
  assert.equal(calls.length,2);
  assert.match(calls[1].opts.headers['idempotency-key'],/^cc:[0-9a-f]{64}$/);
  assert.equal(JSON.parse(calls[1].opts.body).idempotency_key,
    calls[1].opts.headers['idempotency-key']);
  assert.equal(JSON.parse(calls[1].opts.body).max_cost_usd,3);
  assert.throws(()=>createRendererAdapter({healthUrl:'http://evil.example/health',
    submitUrl:'http://evil.example/jobs',token:'x'.repeat(30)}),/HTTPS/);
  await assert.rejects(adapter.submit({...plan,status:'PLANNED_NOT_SUBMITTED'},auth,rights),
    e=>e.code==='NOT_AUTHORIZED');
});
test('organic publisher requires separate exact-film authorization and never sends paid spend',async()=>{
  let posted;
  const publisher=createOrganicPublisher({publishUrl:'https://publisher.example.test/organic',
    token:'x'.repeat(30),fetchFn:async(_url,opts)=>{
      posted=JSON.parse(opts.body);
      return {ok:true,headers:{get:()=>null},text:async()=>JSON.stringify(
        {published:true,external_post_ref:'post:one',publication_receipt_ref:'receipt:post'})};
    }});
  const item={id:'outcome:one',tenant_id:'crown-and-core',version:2,status:'PUBLISH_RESERVED',
    publication_authorization:{version:2,paid_spend_usd:0,expires_at:future(),channel:'instagram_reel',
      hash_30:a,decision_ref:'decision:publish'},final_approval:{version:2},
    qa:{verified:true,cuts:[{artifact_ref:'artifact:one'}]},
    rights_verification:{expires_at:future()}};
  const receipt=await publisher.publish(item);
  assert.equal(receipt.external_post_ref,'post:one');
  assert.equal(posted.paid_spend_usd,0);
  await assert.rejects(publisher.publish({...item,status:'FILM_APPROVED'}),e=>e.code==='NOT_AUTHORIZED');
});
test('private MP4 inspection requires two distinct H264 files with exact durations and hashes',async()=>{
  const dir=mkdtempSync(join(tmpdir(),'cc-studio-qa-'));
  try{
    const f1=join(dir,'one.mp4'),f2=join(dir,'two.mp4');
    writeFileSync(f1,Buffer.alloc(2048,1));
    writeFileSync(f2,Buffer.alloc(2048,2));
    const probe=async path=>({streams:[{codec_type:'video',codec_name:'h264',width:1080,height:1920}],
      format:{duration:path===f1?'30.0':'15.0'}});
    const qa=await inspectVideoCuts({vaultRoot:dir,probe,files:[
      {cut_seconds:30,artifact_ref:'artifact:30',path:f1},
      {cut_seconds:15,artifact_ref:'artifact:15',path:f2}
    ]});
    assert.equal(qa.verified,true);
    assert.notEqual(qa.cuts[0].sha256,qa.cuts[1].sha256);
    await assert.rejects(inspectVideoCuts({vaultRoot:dir,probe,files:[
      {cut_seconds:30,artifact_ref:'artifact:30',path:f1,expected_sha256:c},
      {cut_seconds:15,artifact_ref:'artifact:15',path:f2}
    ]}),e=>e.code==='VIDEO_QA_FAILED');
  }finally{rmSync(dir,{recursive:true,force:true});}
});
test('HTTP production-stage actions are distinct-role gated and never available to agent',async t=>{
  const {studio,id,version}=draft();
  const tokens={agent:'a'.repeat(30),owner:'b'.repeat(30),rights:'c'.repeat(30),
    operator:'d'.repeat(30),qa:'e'.repeat(30),publisher:'f'.repeat(30)};
  const server=createApiServer({studio,tokens});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  const base='http://127.0.0.1:'+server.address().port;
  const post=(action,role,body)=>fetch(base+'/v1/outcomes/'+id+'/'+action,{method:'POST',
    headers:{authorization:'Bearer '+tokens[role],'content-type':'application/json'},
    body:JSON.stringify(body)});
  const rights={version,rights_ref:'rights:one',grant_ref:'grant:one',
    grant_sha256:c,asset_sha256:a,scope:'both',revoked:false,expires_at:future()};
  assert.equal((await post('rights-verify','agent',rights)).status,403);
  assert.equal((await post('rights-verify','rights',rights)).status,200);
  assert.equal((await post('render-authorize','agent',{version,max_cost_usd:1,
    decision_ref:'decision:one',expires_at:future()})).status,403);
  assert.equal((await post('render-authorize','owner',{version,max_cost_usd:1,
    decision_ref:'decision:one',expires_at:future()})).status,200);
  assert.equal((await post('dispatch-reserve','agent',{version,job_id:studio.get(id).render_plan.job_id})).status,403);
});

test('revoked rights after publication require verified takedown and block silent edits',()=>{
  const f=verified();
  f.pipeline.decideFinal(f.id,'owner',{version:f.version,decision:'approve',hash_30:a,hash_15:b,decision_ref:'decision:film'});
  f.pipeline.authorizePublish(f.id,'owner',{version:f.version,channel:'instagram_reel',
    booking_path_verified:true,claim_policy_verified:true,decision_ref:'decision:post',expires_at:until});
  f.pipeline.reservePublication(f.id,'publisher',{version:f.version,decision_ref:'decision:post'});
  f.pipeline.published(f.id,'publisher',{version:f.version,channel:'instagram_reel',
    published_hash:a,external_post_ref:'post:one',publication_receipt_ref:'receipt:post'});
  f.pipeline.revokeRights(f.id,'rights',{version:f.version,rights_ref:'rights:one',
    revocation_ref:'revocation:one'});
  assert.equal(f.studio.get(f.id).status,'TAKEDOWN_REQUIRED');
  assert.equal(f.studio.summary(f.id).published,true);
  rejected(()=>f.studio.proposeStoryboard(f.id,{hook:'Different',story:'Different',
    cta:'Explore',claims_present:false,disclosure_present:false}),'PUBLISHED_IMMUTABLE');
  rejected(()=>f.pipeline.recordTakedown(f.id,'agent',{version:f.version,
    external_post_ref:'post:one',takedown_receipt_ref:'receipt:remove'}),'FORBIDDEN');
  f.pipeline.recordTakedown(f.id,'publisher',{version:f.version,
    external_post_ref:'post:one',takedown_receipt_ref:'receipt:remove'});
  assert.equal(f.studio.summary(f.id).published,false);
  assert.equal(f.studio.get(f.id).status,'TAKEN_DOWN');
});

test('unflagged medspa treatment claim cannot be rendered without clinical screening',()=>{
  const studio=createStudio({now:()=>at});
  const pipeline=createPipeline(studio,{now:()=>at});
  const id=studio.create({outcome:'Create an accurate medspa service film'}).id;
  studio.registerSource(id,{source_type:'facility',source_ref:'asset:one',
    rights_ref:'rights:one',usage_scope:'both'});
  studio.proposeStoryboard(id,{hook:'Our treatments reduce acne scars',
    story:'Show the real Crown & Core space',cta:'Explore',
    claims_present:false,disclosure_present:false});
  const review=studio.requestReview(id);
  studio.decide(id,'owner',{version:review.version,decision:'approve',rights_confirmed:true});
  studio.prepareRenderPlan(id,{provider:'montage',idempotency_key:'job:claim',
    max_cost_usd:5});
  pipeline.verifyRights(id,'rights',{version:review.version,rights_ref:'rights:one',
    grant_ref:'grant:one',grant_sha256:c,asset_sha256:a,scope:'both',
    revoked:false,expires_at:until});
  rejected(()=>pipeline.authorizeRender(id,'owner',{version:review.version,
    max_cost_usd:5,decision_ref:'decision:render',expires_at:until}),'NOT_APPROVED');
  studio.decide(id,'clinical',{version:review.version,decision:'approve',
    claim_ref:'claim:screened'});
  pipeline.authorizeRender(id,'owner',{version:review.version,
    max_cost_usd:5,decision_ref:'decision:render',expires_at:until});
  assert.equal(studio.get(id).status,'RENDER_AUTHORIZED');
});

test('revocation during reserved publication preserves actual receipt and requires takedown',()=>{
  const f=verified();
  f.pipeline.decideFinal(f.id,'owner',{version:f.version,decision:'approve',hash_30:a,
    hash_15:b,decision_ref:'decision:film'});
  f.pipeline.authorizePublish(f.id,'owner',{version:f.version,channel:'instagram_reel',
    booking_path_verified:true,claim_policy_verified:true,decision_ref:'decision:post',
    expires_at:until});
  f.pipeline.reservePublication(f.id,'publisher',{version:f.version,
    decision_ref:'decision:post'});
  f.pipeline.revokeRights(f.id,'rights',{version:f.version,rights_ref:'rights:one',
    revocation_ref:'revocation:during-post'});
  assert.equal(f.studio.get(f.id).status,'PUBLISH_RECONCILIATION_REQUIRED');
  rejected(()=>f.pipeline.reservePublication(f.id,'publisher',{version:f.version,
    decision_ref:'decision:post'}),'INVALID_STATE');
  f.pipeline.published(f.id,'publisher',{version:f.version,channel:'instagram_reel',
    published_hash:a,external_post_ref:'post:late',publication_receipt_ref:'receipt:late'});
  assert.equal(f.studio.get(f.id).status,'TAKEDOWN_REQUIRED');
  assert.equal(f.studio.summary(f.id).published,true);
  f.pipeline.recordTakedown(f.id,'publisher',{version:f.version,
    external_post_ref:'post:late',takedown_receipt_ref:'receipt:removed'});
  assert.equal(f.studio.summary(f.id).published,false);
});
test('late verified external publish receipt remains reconcilable after approval expiry',()=>{
  let clock=at;
  const studio=createStudio({now:()=>clock}),pipeline=createPipeline(studio,{now:()=>clock});
  const f=verified();
  // The trusted proof fixture already reserved an eligible publish action;
  // apply expiration only at receipt reconciliation.
  f.pipeline.decideFinal(f.id,'owner',{version:f.version,decision:'approve',hash_30:a,
    hash_15:b,decision_ref:'decision:film'});
  f.pipeline.authorizePublish(f.id,'owner',{version:f.version,channel:'instagram_reel',
    booking_path_verified:true,claim_policy_verified:true,decision_ref:'decision:post',
    expires_at:until});
  f.pipeline.reservePublication(f.id,'publisher',{version:f.version,
    decision_ref:'decision:post'});
  // Simulate expiry in stored authorization; this cannot authorize a new send.
  f.studio.applyTrusted(f.id,(item,receipt)=>{
    item.publication_authorization.expires_at='2026-11-11T00:00:00Z';
    receipt('proof_expiry_advanced','operator');
  });
  f.pipeline.published(f.id,'publisher',{version:f.version,channel:'instagram_reel',
    published_hash:a,external_post_ref:'post:late',publication_receipt_ref:'receipt:late'});
  assert.equal(f.studio.get(f.id).status,'TAKEDOWN_REQUIRED');
});
