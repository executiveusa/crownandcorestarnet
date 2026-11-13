import test from 'node:test';
import assert from 'node:assert/strict';
import { createStudio, StudioError, TENANT } from '../src/domain.mjs';
import { createApiServer } from '../src/api.mjs';
import { tools, callTool } from '../src/mcp.mjs';

function fixture() {
  let n = 0;
  const studio = createStudio({ now: () => '2026-11-12T00:00:00Z', uuid: () => 'test-' + ++n });
  const created = studio.create({ outcome: 'Make a trustworthy Crown & Core introduction film', goal: 'booking_intent' });
  return { studio, id: created.id };
}
function addReadyDraft(studio, id, claims = false) {
  studio.registerSource(id, { source_type: 'facility', source_ref: 'asset:one', rights_ref: 'rights:one', usage_scope: 'organic' });
  studio.proposeStoryboard(id, { hook: 'Welcome to Crown & Core', story: 'Show authorized real facility footage',
    cta: 'Explore our services', claims_present: claims, disclosure_present: false });
  return studio.requestReview(id);
}
function expectCode(fn, code) {
  assert.throws(fn, error => error instanceof StudioError && error.code === code);
}
test('agent request creates no-execution, no-conversion outcome', () => {
  const { studio, id } = fixture();
  const s = studio.summary(id);
  assert.equal(s.status, 'DRAFT');
  assert.equal(s.verified_video, false);
  assert.equal(s.published, false);
  assert.equal(s.attributed_bookings, null);
  assert.equal(studio.get(id).receipts[0].action, 'outcome_created');
});
test('missing source or storyboard cannot enter review', () => {
  const { studio, id } = fixture();
  expectCode(() => studio.requestReview(id), 'NOT_READY');
});
test('source reference is not verified rights and does not authorize rendering', () => {
  const { studio, id } = fixture();
  studio.registerSource(id, { source_type: 'facility', source_ref: 'asset:one', rights_ref: 'rights:one', usage_scope: 'organic' });
  assert.equal(studio.get(id).source.verified, false);
  expectCode(() => studio.prepareRenderPlan(id, { provider: 'montage', idempotency_key: 'job:one', max_cost_usd: 0 }), 'NOT_APPROVED');
});
test('exact-version owner approval permits plan but no external dispatch', () => {
  const { studio, id } = fixture();
  const draft = addReadyDraft(studio, id);
  expectCode(() => studio.decide(id, 'agent', { version: draft.version, decision: 'approve' }), 'FORBIDDEN');
  expectCode(() => studio.decide(id, 'owner', { version: draft.version - 1, decision: 'approve', rights_confirmed: true }), 'STALE_VERSION');
  expectCode(() => studio.decide(id, 'owner', { version: draft.version, decision: 'approve' }), 'RIGHTS_NOT_VERIFIED');
  const approved = studio.decide(id, 'owner', { version: draft.version, decision: 'approve', rights_confirmed: true });
  assert.equal(approved.status, 'READY_FOR_RENDER_PLAN');
  const plan = studio.prepareRenderPlan(id, { provider: 'montage', idempotency_key: 'job:one', max_cost_usd: 0 });
  assert.equal(plan.render_plan.status, 'PLANNED_NOT_SUBMITTED');
  assert.equal(plan.render_plan.external_dispatch_enabled, false);
  assert.equal(plan.render_plan.publishing_enabled, false);
  assert.equal(plan.render_plan.paid_spend_enabled, false);
  assert.deepEqual(plan.render_plan.cuts_seconds, [30,15]);
  assert.equal(studio.prepareRenderPlan(id, { provider: 'montage', idempotency_key: 'job:one', max_cost_usd: 0 }).render_plan.job_id, plan.render_plan.job_id);
  expectCode(() => studio.prepareRenderPlan(id, { provider: 'montage', idempotency_key: 'job:two', max_cost_usd: 0 }), 'DUPLICATE_PLAN');
});
test('health claims require separate clinical approval with exact version', () => {
  const { studio, id } = fixture();
  const draft = addReadyDraft(studio, id, true);
  const owner = studio.decide(id, 'owner', { version: draft.version, decision: 'approve', rights_confirmed: true });
  assert.equal(owner.status, 'REVIEW_PENDING');
  expectCode(() => studio.prepareRenderPlan(id, { provider: 'montage', idempotency_key: 'job:one', max_cost_usd: 0 }), 'NOT_APPROVED');
  const clinical = studio.decide(id, 'clinical', { version: draft.version, decision: 'approve', claim_ref: 'claim:approved' });
  assert.equal(clinical.status, 'READY_FOR_RENDER_PLAN');
});
test('a revision invalidates all prior approvals and render plan', () => {
  const { studio, id } = fixture();
  const draft = addReadyDraft(studio, id);
  studio.decide(id, 'owner', { version: draft.version, decision: 'approve', rights_confirmed: true });
  studio.prepareRenderPlan(id, { provider: 'montage', idempotency_key: 'job:one', max_cost_usd: 0 });
  const revised = studio.proposeStoryboard(id, { hook: 'A different story', story: 'Only authorized footage',
    cta: 'Explore services', claims_present: false, disclosure_present: false });
  assert.equal(revised.status, 'DRAFT');
  assert.equal(revised.render_plan, null);
  assert.equal(revised.approvals.owner, null);
});
test('synthetic testimonial impersonation is blocked', () => {
  const { studio, id } = fixture();
  studio.registerSource(id, { source_type: 'synthetic', source_ref: 'asset:synthetic', rights_ref: 'rights:synthetic', usage_scope: 'both' });
  expectCode(() => studio.proposeStoryboard(id, { hook: 'Real customer testimonial', story: 'My treatment changed my life',
    cta: 'Visit us', claims_present: false, disclosure_present: true }), 'SYNTHETIC_TESTIMONIAL');
});
test('synthetic and creator content require disclosure before review', () => {
  for (const source_type of ['synthetic','creator']) {
    const { studio, id } = fixture();
    studio.registerSource(id, { source_type, source_ref: 'asset:one', rights_ref: 'rights:one', usage_scope: 'both' });
    studio.proposeStoryboard(id, { hook: 'A tour', story: 'Authorized imagery only',
      cta: 'Learn more', claims_present: false, disclosure_present: false });
    expectCode(() => studio.requestReview(id), 'DISCLOSURE_REQUIRED');
  }
});
test('obvious unflagged medical claims and personal contact inputs are denied', () => {
  const { studio, id } = fixture();
  expectCode(() => studio.create({ outcome: 'Email person@example.com for a treatment' }), 'SENSITIVE_INPUT');
  expectCode(() => studio.registerSource(id, { source_type: 'facility', source_ref: 'https://secret.example', rights_ref: 'rights:one', usage_scope: 'both' }), 'INVALID_REF');
  expectCode(() => studio.proposeStoryboard(id, { hook: 'Guaranteed results', story: 'Our facility', cta: 'Visit',
    claims_present: false, disclosure_present: false }), 'CLAIM_REVIEW_REQUIRED');
});
test('cross-tenant input is denied and stored foreign items do not appear in list', () => {
  const { studio } = fixture();
  expectCode(() => studio.create({ tenant_id: 'tangles-and-locs', outcome: 'Unrelated campaign' }), 'TENANT_DENIED');
  const foreign = createStudio({ initial: [{ id:'foreign', tenant_id:'tangles-and-locs', outcome:'private', status:'DRAFT' }] });
  assert.deepEqual(foreign.list(), []);
  expectCode(() => foreign.get('foreign'), 'TENANT_DENIED');
});
test('API denies unauthenticated requests and agent cannot approve', async t => {
  const { studio } = fixture();
  const tokens = { agent:'agent-test-token-long-enough', owner:'owner-test-token-long-enough', clinical:'clinical-test-token-long-enough' };
  const server = createApiServer({ studio, tokens });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = 'http://127.0.0.1:' + server.address().port;
  const request = (path, token, method = 'GET', body) => fetch(base + path, {
    method, headers: { ...(token ? {authorization:'Bearer '+token} : {}),
      ...(body ? {'content-type':'application/json'} : {}) },
    ...(body ? { body:JSON.stringify(body) } : {}) });
  assert.equal((await request('/health')).status, 200);
  assert.equal((await request('/v1/outcomes')).status, 401);
  const created = await request('/v1/outcomes', tokens.agent, 'POST', { outcome:'Make a calm film for Crown & Core' });
  assert.equal(created.status, 201);
  const id = (await created.json()).outcome.id;
  assert.equal((await request('/v1/outcomes/'+id+'/approvals', tokens.agent, 'POST', {version:1,decision:'approve'})).status, 403);
  assert.equal((await request('/v1/outcomes', tokens.owner, 'POST', {outcome:'Unauthorized agent action'})).status, 403);
  assert.equal((await request('/v1/outcomes/'+id+'/summary', tokens.agent)).status, 200);
  assert.equal((await request('/v1/outcomes/'+id+'/render-plan', tokens.agent, 'POST',
    {provider:'montage',idempotency_key:'job:one',max_cost_usd:0})).status, 409);
  assert.equal((await request('/v1/outcomes', 'wrong-token')).status, 401);
  assert.equal((await request('/v1/outcomes', tokens.agent, 'POST', {outcome:'Other tenant',tenant_id:'tangles-and-locs'})).status, 403);
  assert.equal((await request('/v1/outcomes', tokens.agent, 'POST', {outcome:'ok',unexpected:'extra'})).status, 201);
  const viaMcp = await callTool('creator_outcome_status', { id }, { CREATOR_STUDIO_AGENT_TOKEN:tokens.agent, CREATOR_STUDIO_API_URL:base });
  assert.equal(viaMcp.summary.status, 'DRAFT');
});
test('MCP tool list is agent-scoped and cannot authorize publication', () => {
  assert.equal(tools.length, 9);
  assert.ok(tools.every(tool => tool.name.startsWith('creator_')));
  assert.ok(!tools.some(tool => /approve|publish|spend|launch/i.test(tool.name)));
});

test('replacing a media source invalidates its storyboard and prior approvals',()=>{
  const {studio,id}=fixture();
  studio.registerSource(id,{source_type:'facility',source_ref:'asset:first',
    rights_ref:'rights:first',usage_scope:'both'});
  studio.proposeStoryboard(id,{hook:'A real place',story:'Verified footage',
    cta:'Explore',claims_present:false,disclosure_present:false});
  studio.registerSource(id,{source_type:'synthetic',source_ref:'asset:second',
    rights_ref:'rights:second',usage_scope:'both'});
  assert.equal(studio.get(id).storyboard,null);
  expectCode(()=>studio.requestReview(id),'NOT_READY');
});
test('synthetic first-person invented visitor experience is blocked even with disclosure',()=>{
  const {studio,id}=fixture();
  studio.registerSource(id,{source_type:'synthetic',source_ref:'asset:fake',
    rights_ref:'rights:fake',usage_scope:'both'});
  expectCode(()=>studio.proposeStoryboard(id,{hook:'I visited Crown & Core and loved it',
    story:'I felt wonderful after my visit',cta:'Learn more',
    claims_present:false,disclosure_present:true}),'SYNTHETIC_TESTIMONIAL');
});
test('wrong-tenant reviewer decisions and render plans are rejected',()=>{
  const {studio,id}=fixture();
  const draft=addReadyDraft(studio,id);
  expectCode(()=>studio.decide(id,'owner',{tenant_id:'tangles-and-locs',version:draft.version,
    decision:'approve',rights_confirmed:true}),'TENANT_DENIED');
  studio.decide(id,'owner',{version:draft.version,decision:'approve',rights_confirmed:true});
  expectCode(()=>studio.prepareRenderPlan(id,{tenant_id:'tangles-and-locs',
    provider:'montage',idempotency_key:'job:one',max_cost_usd:0}),'TENANT_DENIED');
});
test('same idempotency key with changed provider or budget is a conflict',()=>{
  const {studio,id}=fixture();
  const draft=addReadyDraft(studio,id);
  studio.decide(id,'owner',{version:draft.version,decision:'approve',rights_confirmed:true});
  studio.prepareRenderPlan(id,{provider:'montage',idempotency_key:'job:one',max_cost_usd:5});
  expectCode(()=>studio.prepareRenderPlan(id,{provider:'motion-master',
    idempotency_key:'job:one',max_cost_usd:5}),'DUPLICATE_PLAN');
  expectCode(()=>studio.prepareRenderPlan(id,{provider:'montage',
    idempotency_key:'job:one',max_cost_usd:6}),'DUPLICATE_PLAN');
});
