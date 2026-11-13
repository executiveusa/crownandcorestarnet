import test from 'node:test';
import assert from 'node:assert/strict';
import { createStudio } from '../src/domain.mjs';
import { createCreatorWorkflow } from '../src/creators.mjs';
import { createApiServer } from '../src/api.mjs';
import { tools } from '../src/mcp.mjs';
import { createCreatorOutreachAdapter } from '../src/adapters.mjs';
const at='2026-11-12T20:00:00Z',expires='2026-11-13T20:00:00Z';
const code=(fn,c)=>assert.throws(fn,e=>e.code===c);
function fixture(clock=()=>at){
  const studio=createStudio({now:clock});
  const id=studio.create({outcome:'Create an authorized local creator story'}).id;
  return {studio,id,creators:createCreatorWorkflow(studio,{now:clock})};
}
test('agent can shortlist and draft but cannot send creator outreach',()=>{
  const {studio,id,creators}=fixture();
  creators.proposeCandidate(id,'agent',{creator_ref:'creator:one',profile_ref:'profile:one',
    fit_reason:'Local wellness storytelling with disclosed partnerships'});
  code(()=>creators.proposeCandidate(id,'agent',{creator_ref:'creator:one',
    profile_ref:'profile:one',fit_reason:'duplicate'}),'DUPLICATE_CANDIDATE');
  code(()=>creators.prepareOutreach(id,'agent',{creator_ref:'creator:one',
    message:'Email private@example.com for payment',terms_ref:'terms:one',max_fee_usd:200}),'INVALID_CONTENT');
  creators.prepareOutreach(id,'agent',{creator_ref:'creator:one',
    message:'Would you consider an authorized and clearly disclosed Crown & Core visit film?',
    terms_ref:'terms:one',max_fee_usd:200});
  const draft=studio.get(id).creator_campaign.outreach[0];
  assert.equal(draft.status,'DRAFT_UNSENT');
  assert.equal(draft.delivery,null);
  code(()=>creators.recordSent(id,'agent',{outreach_id:draft.outreach_id,
    delivery_receipt_ref:'receipt:one',external_message_ref:'message:one'}),'FORBIDDEN');
  code(()=>creators.authorizeOutreach(id,'owner',{version:1,outreach_id:draft.outreach_id,
    message_sha256:'a'.repeat(64),permission_ref:'permission:one',
    decision_ref:'decision:one',expires_at:expires,max_fee_usd:200}),'STALE_MESSAGE');
  creators.authorizeOutreach(id,'owner',{version:1,outreach_id:draft.outreach_id,
    message_sha256:draft.message_sha256,permission_ref:'permission:one',
    decision_ref:'decision:one',expires_at:expires,max_fee_usd:200});
  assert.equal(studio.get(id).creator_campaign.outreach[0].status,'OUTREACH_AUTHORIZED_UNSENT');
  creators.reserveOutreach(id,'operator',{outreach_id:draft.outreach_id});
  creators.recordSent(id,'operator',{outreach_id:draft.outreach_id,
    delivery_receipt_ref:'receipt:one',external_message_ref:'message:one'});
  assert.equal(studio.get(id).creator_campaign.outreach[0].status,'SENT_VERIFIED');
});
test('rights reviewer records creator release, agent cannot assert it',()=>{
  const {studio,id,creators}=fixture();
  creators.proposeCandidate(id,'agent',{creator_ref:'creator:one',profile_ref:'profile:one',
    fit_reason:'Public profile evidence'});
  const release={creator_ref:'creator:one',release_ref:'release:one',
    release_sha256:'b'.repeat(64),scope:'both',revoked:false,expires_at:expires};
  code(()=>creators.recordRelease(id,'agent',release),'FORBIDDEN');
  creators.recordRelease(id,'rights',release);
  assert.equal(studio.get(id).creator_campaign.candidates[0].status,'RELEASE_VERIFIED');
});
test('creator MCP tools remain agent-only, without send or approve capabilities',()=>{
  assert.equal(tools.length,11);
  assert.ok(tools.some(t=>t.name==='creator_candidate_propose'));
  assert.ok(tools.some(t=>t.name==='creator_outreach_prepare'));
  assert.ok(!tools.some(t=>/send|approve|publish|spend|contact/i.test(t.name)));
});
test('creator API denies agent authorizing outreach',async t=>{
  const {studio,id}=fixture();
  const tokens={agent:'a'.repeat(30),owner:'b'.repeat(30),operator:'c'.repeat(30),rights:'d'.repeat(30)};
  const server=createApiServer({studio,tokens});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  const base='http://127.0.0.1:'+server.address().port+'/v1/outcomes/'+id;
  const post=(path,role,body)=>fetch(base+path,{method:'POST',
    headers:{authorization:'Bearer '+tokens[role],'content-type':'application/json'},
    body:JSON.stringify(body)});
  assert.equal((await post('/creator-candidate','agent',{creator_ref:'creator:one',
    profile_ref:'profile:one',fit_reason:'Verified local creator profile'})).status,200);
  assert.equal((await post('/creator-outreach-authorize','agent',{version:1})).status,403);
  assert.equal((await post('/creator-release','agent',{creator_ref:'creator:one'})).status,403);
});

test('outreach adapter only sends exact owner-approved message to opaque creator reference',async()=>{
  const {studio,id,creators}=fixture(()=>new Date().toISOString());
  creators.proposeCandidate(id,'agent',{creator_ref:'creator:one',profile_ref:'profile:one',
    fit_reason:'Local relevant public profile'});
  creators.prepareOutreach(id,'agent',{creator_ref:'creator:one',
    message:'Would you consider a clearly disclosed Crown & Core creator project?',
    terms_ref:'terms:one',max_fee_usd:100});
  const draft=studio.get(id).creator_campaign.outreach[0];
  creators.authorizeOutreach(id,'owner',{version:1,outreach_id:draft.outreach_id,
    message_sha256:draft.message_sha256,permission_ref:'permission:one',
    decision_ref:'decision:one',expires_at:new Date(Date.now()+3600000).toISOString(),max_fee_usd:100});
  let posted;
  const adapter=createCreatorOutreachAdapter({sendUrl:'https://contact.example.test/send',
    token:'x'.repeat(30),fetchFn:async(_url,opts)=>{
      posted=JSON.parse(opts.body);
      return {ok:true,headers:{get:()=>null},text:async()=>JSON.stringify(
        {delivered:true,charged_usd:0,external_message_ref:'message:one',delivery_receipt_ref:'receipt:one'})};
    }});
  creators.reserveOutreach(id,'operator',{outreach_id:draft.outreach_id});
  const receipt=await adapter.send(studio.get(id),draft.outreach_id);
  assert.equal(receipt.delivery_receipt_ref,'receipt:one');
  assert.equal(posted.creator_ref,'creator:one');
  assert.equal(posted.permission_ref,'permission:one');
  assert.equal(posted.charged_usd,0);
  assert.equal(posted.message_sha256,draft.message_sha256);
  await assert.rejects(adapter.send({...studio.get(id),creator_campaign:{outreach:[]}},draft.outreach_id),
    e=>e.code==='NOT_AUTHORIZED');
});

test('creative revision invalidates unsent outreach and preserves sent receipt history',()=>{
  const {studio,id,creators}=fixture();
  creators.proposeCandidate(id,'agent',{creator_ref:'creator:one',profile_ref:'profile:one',
    fit_reason:'Verified public source'});
  creators.prepareOutreach(id,'agent',{creator_ref:'creator:one',
    message:'Would you consider a licensed and disclosed brand film?',
    terms_ref:'terms:one',max_fee_usd:0});
  const old=studio.get(id).creator_campaign.outreach[0];
  studio.registerSource(id,{source_type:'facility',source_ref:'asset:one',
    rights_ref:'rights:one',usage_scope:'both'});
  const updated=studio.get(id).creator_campaign;
  assert.equal(updated.outreach[0].status,'INVALIDATED_REVISION');
  assert.equal(updated.candidates[0].status,'PROPOSED_UNCONTACTED');
  code(()=>creators.authorizeOutreach(id,'owner',{version:studio.get(id).version,
    outreach_id:old.outreach_id,message_sha256:old.message_sha256,
    permission_ref:'permission:one',decision_ref:'decision:one',
    expires_at:expires,max_fee_usd:0}),'INVALID_STATE');
});
