// Crown & Core Creator Studio: local-proof domain, no external side effects.
// No customer/PHI data, payment, posting, messaging or rendering in this module.
import { randomUUID, createHash } from 'node:crypto';

export const TENANT = 'crown-and-core';
export class StudioError extends Error {
  constructor(code, message, status = 400) { super(message); this.name = 'StudioError'; this.code = code; this.status = status; }
}
const fail = (code, message, status) => { throw new StudioError(code, message, status); };
const clone = value => structuredClone(value);
const goals = new Set(['qualified_inquiries', 'booking_intent', 'owned_media']);
const placements = new Set(['instagram_reel', 'facebook_reel', 'youtube_short', 'organic_video']);
const sourceTypes = new Set(['facility', 'creator', 'staff', 'synthetic']);
const scopes = new Set(['organic', 'paid', 'both']);
const providers = new Set(['motion-master', 'montage']);
const hasSensitivePattern = value => /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}|(?:\+?\d[\d\s().-]{8,}\d)/i.test(value);
const sensitive = value => { if (hasSensitivePattern(value)) fail('SENSITIVE_INPUT', 'Do not submit personal contact information or customer records to this proof system.'); };
function text(value, name, max = 500, required = true) {
  if (value == null && !required) return '';
  if (typeof value !== 'string') fail('INVALID_INPUT', name + ' must be text.');
  const v = value.trim();
  if (required && !v) fail('INVALID_INPUT', name + ' is required.');
  if (v.length > max) fail('INVALID_INPUT', name + ' exceeds the limit.');
  sensitive(v);
  return v;
}
function ref(value, name, required = true) {
  const v = text(value, name, 120, required);
  if (v && !/^[a-z][a-z0-9._:-]{2,119}$/i.test(v)) fail('INVALID_REF', name + ' must be an opaque reference, not a URL or personal data.');
  return v;
}
function choice(value, allowed, name) {
  if (!allowed.has(value)) fail('INVALID_INPUT', 'Unsupported ' + name + '.');
  return value;
}
function ensureTenant(input) {
  if (input?.tenant_id != null && input.tenant_id !== TENANT) fail('TENANT_DENIED', 'Crown & Core tenant only.', 403);
}
function receipt(item, action, role, at, actor_ref = null) {
  const previous_hash = item.receipts.at(-1)?.hash ?? null;
  const event = { action, role, at, version: item.version, previous_hash };
  if (actor_ref) event.actor_ref = actor_ref;
  event.hash = createHash('sha256').update(JSON.stringify(event)).digest('hex');
  item.receipts.push(event);
}
function concise(item) {
  const messages = {
    DRAFT: 'Add rights-cleared source and storyboard.',
    REVIEW_PENDING: 'Await owner and applicable clinical decision.',
    READY_FOR_RENDER_PLAN: 'Prepare a provider-neutral render plan.',
    RENDER_PLAN_READY: 'Verify source rights independently and authorize a capped render.',
    RENDER_AUTHORIZED: 'A trusted operator must dispatch the approved plan.',
    DISPATCH_RESERVED: 'Reconcile provider acknowledgement before retrying.',
    RENDERING: 'Await authenticated provider result.',
    RENDERED: 'Independently verify both video cuts and their hashes.',
    READY_FOR_FINAL_REVIEW: 'Owner must approve exact final video hashes.',
    FILM_APPROVED: 'Approved film ready for delivery; publishing requires separate approval.',
    PUBLISH_AUTHORIZED: 'A trusted publisher may execute the authorized organic post.',
    PUBLISHED_VERIFIED: 'Publication receipt recorded; attribution remains unverified unless sourced.',
    FAILED: 'Review failure receipt and request a new creative revision.',
    RIGHTS_REVOKED: 'Rights revoked. Replace the media before further work.',
    TAKEDOWN_REQUIRED: 'Published content has revoked rights. Authorized publisher must remove it.',
    TAKEN_DOWN: 'Removal receipt recorded. Publication is no longer live.'
  };
  return { id: item.id, tenant_id: TENANT, version: item.version, status: item.status,
    outcome: item.outcome, next_action: messages[item.status] ?? 'Check the recorded blocker.',
    verified_video: !!item.qa?.verified,
    published: !!item.publication_receipt && !item.takedown,
    attributed_bookings: item.attribution?.bookings ?? null,
    attributed_revenue: item.attribution?.revenue_usd ?? null };
}
export function createStudio({ initial = [], persist = () => {}, now = () => new Date().toISOString(), uuid = randomUUID } = {}) {
  const data = new Map(initial.map(item => [item.id, clone(item)]));
  function save(item) {
    const snapshot = [...data.values()].filter(x => x.id !== item.id).map(clone).concat([clone(item)]);
    persist(snapshot);
    data.set(item.id, clone(item));
    return clone(item);
  }
  function read(id) {
    const item = data.get(id);
    if (!item) fail('NOT_FOUND', 'Outcome not found.', 404);
    if (item.tenant_id !== TENANT) fail('TENANT_DENIED', 'Tenant mismatch.', 403);
    return clone(item);
  }
  function reset(item) {
    item.version++;
    item.status = 'DRAFT';
    item.approvals = { owner: null, clinical: null };
    item.render_plan = null;
    item.rights_verification = null;
    item.render_authorization = null;
    item.provider_receipt = null;
    item.qa = null;
    item.final_approval = null;
    item.publication_authorization = null;
    item.publication_receipt = null;
    item.attribution = null;
    if (item.creator_campaign) {
      for (const draft of item.creator_campaign.outreach ?? []) {
        if (draft.status !== 'SENT_VERIFIED') {
          draft.status = 'INVALIDATED_REVISION';
          draft.authorization = null;
        }
      }
      for (const candidate of item.creator_campaign.candidates ?? []) {
        if (candidate.status === 'OUTREACH_DRAFT') candidate.status = 'PROPOSED_UNCONTACTED';
      }
    }
  }
  function create(input = {}) {
    ensureTenant(input);
    const outcome = text(input.outcome, 'outcome', 500);
    const goal = choice(input.goal ?? 'booking_intent', goals, 'goal');
    const placement = choice(input.placement ?? 'instagram_reel', placements, 'placement');
    const item = { id: uuid(), tenant_id: TENANT, outcome, goal, placement,
      creative_direction: text(input.creative_direction ?? '', 'creative_direction', 600, false),
      service_ref: ref(input.service_ref ?? '', 'service_ref', false),
      cuts_seconds: [30, 15], version: 1, status: 'DRAFT',
      source: null, storyboard: null, approvals: { owner: null, clinical: null },
      render_plan: null, performance: null, receipts: [], created_at: now() };
    receipt(item, 'outcome_created', 'agent', now());
    return save(item);
  }
  function registerSource(id, input = {}) {
    ensureTenant(input);
    const item = read(id);
    if (item.publication_receipt) fail('PUBLISHED_IMMUTABLE', 'Create a new outcome; published revisions must retain their audit trail.', 409);
    const source_type = choice(input.source_type, sourceTypes, 'source_type');
    const source_ref = ref(input.source_ref, 'source_ref');
    const rights_ref = ref(input.rights_ref, 'rights_ref');
    const usage_scope = choice(input.usage_scope, scopes, 'usage_scope');
    reset(item);
    item.storyboard = null; // A different source invalidates the old story and claim review.
    item.source = { source_type, source_ref, rights_ref, usage_scope,
      verified: false, note: 'Reference supplied by agent; human rights attestation required.' };
    receipt(item, 'source_registered_unverified', 'agent', now());
    return save(item);
  }
  function proposeStoryboard(id, input = {}) {
    ensureTenant(input);
    const item = read(id);
    if (item.publication_receipt) fail('PUBLISHED_IMMUTABLE', 'Create a new outcome for new published creative.', 409);
    const hook = text(input.hook, 'hook', 280);
    const story = text(input.story, 'story', 900);
    const cta = text(input.cta, 'cta', 280);
    if (item.source?.source_type === 'synthetic' &&
        /testimonial|patient review|real customer|my treatment|my results|\bi (visited|tried|loved|received|experienced|felt|got|had)\b|\bmy (visit|experience|skin|face|body|results)\b/i.test(hook + ' ' + story + ' ' + cta)) {
      fail('SYNTHETIC_TESTIMONIAL', 'Synthetic footage cannot impersonate a customer or treatment experience.');
    }
    if (input.claims_present === false &&
        /guaranteed results|cures?\b|treats?\b|eliminates? wrinkles|fda[- ]approved|no side effects|permanent results|before and after/i.test(hook + ' ' + story + ' ' + cta))
      fail('CLAIM_REVIEW_REQUIRED', 'Potential treatment or outcome claim must be explicitly flagged for clinical review.');
    if (typeof input.claims_present !== 'boolean') fail('INVALID_INPUT', 'claims_present must be an explicit boolean.');
    if (typeof input.disclosure_present !== 'boolean') fail('INVALID_INPUT', 'disclosure_present must be an explicit boolean.');
    reset(item);
    item.storyboard = { hook, story, cta, claims_present: input.claims_present,
      disclosure_present: input.disclosure_present,
      note: 'Agent proposal only; automatic claim/disclosure checks are not legal clearance.' };
    receipt(item, 'storyboard_proposed', 'agent', now());
    return save(item);
  }
  function requestReview(id) {
    const item = read(id);
    if (item.status !== 'DRAFT') fail('INVALID_STATE', 'Only a draft may enter storyboard review.', 409);
    if (!item.source || !item.storyboard) fail('NOT_READY', 'Source rights reference and storyboard are required.', 409);
    if (item.source.source_type === 'synthetic' && !item.storyboard.disclosure_present)
      fail('DISCLOSURE_REQUIRED', 'Synthetic content requires clear disclosure.', 409);
    if (item.source.source_type === 'creator' && !item.storyboard.disclosure_present)
      fail('DISCLOSURE_REQUIRED', 'Creator content requires material-connection disclosure review.', 409);
    // Organic social posts are not automatically paid ads; the owner verifies the actual use.
    // No publication or paid media execution is available in this proof build.
    item.status = 'REVIEW_PENDING';
    receipt(item, 'review_requested', 'agent', now());
    return save(item);
  }
  function decide(id, role, input = {}, actorRef = null) {
    ensureTenant(input);
    const item = read(id);
    if (!['owner', 'clinical'].includes(role)) fail('FORBIDDEN', 'Only authenticated reviewers may decide.', 403);
    if (item.status !== 'REVIEW_PENDING' &&
        !(role === 'clinical' && item.status === 'READY_FOR_RENDER_PLAN'))
      fail('NOT_READY', 'No pending review.', 409);
    if (!Number.isInteger(input.version) || input.version !== item.version) fail('STALE_VERSION', 'Approval must match the current exact version.', 409);
    if (!['approve', 'request_changes'].includes(input.decision)) fail('INVALID_INPUT', 'Invalid decision.');
    // Even claim-free medspa content may contain an unflagged treatment claim.
    // Qualified clinical reviewers may attest to a claim-free revision.
    if (input.decision === 'request_changes') {
      reset(item);
      receipt(item, 'changes_requested', role, now(), actorRef);
      return save(item);
    }
    if (item.approvals[role]?.version === item.version)
      fail('DUPLICATE_APPROVAL', 'This reviewer already approved the current revision.', 409);
    if (role === 'owner') {
      if (input.rights_confirmed !== true) fail('RIGHTS_NOT_VERIFIED', 'Owner must attest to the actual rights record.', 409);
      item.approvals.owner = { version: item.version, at: now(), rights_ref: item.source.rights_ref };
    } else {
      const claim_ref = ref(input.claim_ref, 'claim_ref');
      item.approvals.clinical = { version: item.version, at: now(), claim_ref };
    }
    if (item.approvals.owner?.version === item.version &&
        (!item.storyboard.claims_present || item.approvals.clinical?.version === item.version)) {
      item.status = 'READY_FOR_RENDER_PLAN';
    }
    receipt(item, role + '_approved_version', role, now(), actorRef);
    return save(item);
  }
  function prepareRenderPlan(id, input = {}) {
    ensureTenant(input);
    const item = read(id);
    if (item.render_plan) {
      if (input.idempotency_key === item.render_plan.idempotency_key &&
          input.provider === item.render_plan.provider &&
          input.max_cost_usd === item.render_plan.max_cost_usd) return item;
      fail('DUPLICATE_PLAN', 'Existing plan differs from retry payload.', 409);
    }
    if (item.status !== 'READY_FOR_RENDER_PLAN') fail('NOT_APPROVED', 'Exact-version rights, owner and applicable clinical approvals are required.', 409);
    const provider = choice(input.provider, providers, 'provider');
    const idempotency_key = ref(input.idempotency_key, 'idempotency_key');
    if (typeof input.max_cost_usd !== 'number' || !Number.isFinite(input.max_cost_usd) ||
        input.max_cost_usd < 0 || input.max_cost_usd > 1000)
      fail('INVALID_BUDGET', 'Provide a nonnegative planning cap up to 1000 USD.');
    item.render_plan = {
      job_id: uuid(), idempotency_key, provider, tenant_id: TENANT, outcome_id: id,
      version: item.version, dimensions: { width: 1080, height: 1920 },
      cuts_seconds: [30, 15], source_refs: [item.source.source_ref],
      rights_refs: [item.source.rights_ref],
      claim_refs: item.approvals.clinical ? [item.approvals.clinical.claim_ref] : [],
      max_cost_usd: input.max_cost_usd, status: 'PLANNED_NOT_SUBMITTED',
      provider_job_id: null, artifact_refs: [], verified: false,
      external_dispatch_enabled: false, paid_spend_enabled: false, publishing_enabled: false
    };
    item.status = 'RENDER_PLAN_READY';
    receipt(item, 'render_plan_prepared_no_dispatch', 'agent', now());
    return save(item);
  }
  // Trusted in-process transitions only. Never expose this function over HTTP/MCP.
  function applyTrusted(id, update) {
    const item = read(id);
    update(item, (action, role, actorRef) => receipt(item, action, role, now(), actorRef));
    return save(item);
  }
  return {
    create, get: read, list: () => [...data.values()].filter(item => item.tenant_id === TENANT).slice(-25).map(concise),
    summary: id => concise(read(id)), registerSource, proposeStoryboard, requestReview, decide, prepareRenderPlan,
    applyTrusted
  };
}
