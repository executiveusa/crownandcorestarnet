import { readJson, writeJson, arg, rootPath } from '../../lib/io.mjs';

const input = arg('input', rootPath('data', 'templates', 'reactivation-input.json'));
const output = arg('out', rootPath('outbox', 'R3-REACTIVATION-DRAFT.json'));
const d = readJson(input);

const blockers = [];
if (!d.campaign_id) blockers.push('missing campaign_id');
if (!d.segment) blockers.push('missing segment');
if (d.eligible_count === null || d.eligible_count === undefined) blockers.push('eligible_count unknown');
if (d.consent_verified !== true) blockers.push('consent/marketing eligibility not verified');
if (!d.offer) blockers.push('offer not defined');
if (!d.booking_url) blockers.push('booking_url not defined');
if (d.owner_approved !== true) blockers.push('owner approval missing');

const status = blockers.length ? 'DRAFT_BLOCKED' : 'READY_FOR_APPROVAL_GATE';

const plan = {
  campaign_id: d.campaign_id,
  status,
  mode: 'draft_only',
  segment: d.segment,
  eligible_count: d.eligible_count,
  service: d.service,
  offer: d.offer,
  booking_url: d.booking_url,
  sequence: [
    {
      step: 1,
      purpose: 'private check-in / reactivation',
      channel: 'TBD',
      copy: d.offer
        ? `Crown & Core check-in: ${d.offer}. If you would like to come back, use the approved booking link. Reply STOP to opt out.`
        : null
    },
    {
      step: 2,
      purpose: 'booking reminder for interested responders',
      channel: 'TBD',
      copy: 'Draft only. Must be generated from approved service, timing and booking rules.'
    },
    {
      step: 3,
      purpose: 'post-visit private feedback',
      channel: 'TBD',
      copy: 'Ask for honest private feedback. Reward, if any, must not depend on sentiment.'
    },
    {
      step: 4,
      purpose: 'optional honest public review',
      channel: 'TBD',
      copy: 'Offer the same optional public-review path regardless of private feedback sentiment.'
    }
  ],
  measurement: [
    'eligible',
    'contacted',
    'delivered',
    'responded',
    'booked',
    'showed',
    'completed_return_visit',
    'feedback',
    'review_click',
    'reward_issued',
    'reward_redeemed',
    'attributable_return_revenue'
  ],
  hard_rules: {
    review_gating: false,
    reward_conditioned_on_positive_rating: false,
    reward_conditioned_on_public_review: false
  },
  blockers,
  notes: d.notes ?? []
};

writeJson(output, plan);
console.log(`${status}: ${d.campaign_id ?? 'unknown'}`);
if (blockers.length) for (const blocker of blockers) console.log(`- ${blocker}`);
