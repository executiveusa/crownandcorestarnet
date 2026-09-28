import { readJson, writeJson, arg, rootPath } from '../../lib/io.mjs';

const input = arg('input', rootPath('data', 'templates', 'media-input.json'));
const output = arg('out', rootPath('outbox', 'MEDIA-PLAN.json'));
const d = readJson(input);

const blockers = [];
if (!d.source_id) blockers.push('missing source_id');
if (!d.source_type) blockers.push('missing source_type');
if (!d.title) blockers.push('title unknown');
if (d.transcript_available !== true) blockers.push('transcript unavailable: claims/clips cannot be source-grounded yet');

const topics = Array.isArray(d.topics) ? d.topics : [];
const claims = Array.isArray(d.approved_claims) ? d.approved_claims : [];

const plan = {
  source_id: d.source_id,
  status: blockers.length ? 'DRAFT_BLOCKED' : 'READY_TO_EDIT',
  publishing_status: d.owner_approved_for_publishing === true ? 'APPROVED_SOURCE' : 'NOT_APPROVED_FOR_PUBLISHING',
  source: {
    type: d.source_type,
    title: d.title,
    guest: d.guest,
    service: d.service,
    duration_minutes: d.duration_minutes,
    transcript_available: d.transcript_available
  },
  assets: [
    {type:'full_episode', quantity:1, rule:'Use source recording; factual claims must trace to transcript or approved facts.'},
    {type:'short_clip', quantity:'5-10 candidates', rule:'Each clip requires source timestamp and no invented claim.'},
    {type:'faq', quantity:'up to 5', rule:'Derive from actual questions/topics in source.'},
    {type:'article', quantity:1, rule:'Summarize source; clearly attribute guest expertise where relevant.'},
    {type:'email', quantity:1, rule:'One useful takeaway and one clear next action.'},
    {type:'landing_page_asset', quantity:'as justified', rule:'Only claims in approved_claims or verified Crown & Core facts.'},
    {type:'future_paid_candidate', quantity:'0 until performance gate', rule:'Organic/source proof first.'}
  ],
  topics,
  approved_claims: claims,
  blockers,
  next_action: blockers.length
    ? 'Resolve blockers before editing/publishing.'
    : 'Create timestamped clip candidates and route them for owner approval.'
};

writeJson(output, plan);
console.log(`${plan.status}: ${d.source_id}`);
