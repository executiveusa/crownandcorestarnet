import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const inputPath = path.join(root, 'data', 'current-state.json');
const outDir = path.join(root, 'outbox');
const outPath = path.join(outDir, 'GAP-AUDIT.md');

const state = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const m = state.metrics ?? {};

const checks = [
  {
    stage: 'WEBSITE',
    proximity: 7,
    known: m.website_mobile_ready !== null || m.website_load_seconds !== null,
    problem:
      m.website_mobile_ready === false ||
      (typeof m.website_load_seconds === 'number' && m.website_load_seconds > 3),
    evidence: [
      m.website_mobile_ready === null ? null : `mobile_ready=${m.website_mobile_ready}`,
      m.website_load_seconds === null ? null : `load_seconds=${m.website_load_seconds}`
    ].filter(Boolean).join(', ')
  },
  {
    stage: 'BOOKING',
    proximity: 9,
    known: m.booking_path_verified !== null,
    problem: m.booking_path_verified === false,
    evidence: m.booking_path_verified === null ? '' : `booking_path_verified=${m.booking_path_verified}`
  },
  {
    stage: 'RESPONSE',
    proximity: 10,
    known: m.median_lead_response_minutes !== null || m.monthly_missed_calls !== null,
    problem:
      (typeof m.median_lead_response_minutes === 'number' && m.median_lead_response_minutes > 15) ||
      (typeof m.monthly_missed_calls === 'number' && m.monthly_missed_calls > 0),
    evidence: [
      m.median_lead_response_minutes === null ? null : `median_response_min=${m.median_lead_response_minutes}`,
      m.monthly_missed_calls === null ? null : `missed_calls=${m.monthly_missed_calls}`
    ].filter(Boolean).join(', ')
  },
  {
    stage: 'SHOW',
    proximity: 10,
    known: m.monthly_no_shows !== null,
    problem: typeof m.monthly_no_shows === 'number' && m.monthly_no_shows > 0,
    evidence: m.monthly_no_shows === null ? '' : `no_shows=${m.monthly_no_shows}`
  },
  {
    stage: 'RETURN',
    proximity: 9,
    known: m.dormant_customers_90d_plus !== null || m.monthly_returning_visits !== null,
    problem:
      typeof m.dormant_customers_90d_plus === 'number' && m.dormant_customers_90d_plus > 0,
    evidence: [
      m.dormant_customers_90d_plus === null ? null : `dormant_90d_plus=${m.dormant_customers_90d_plus}`,
      m.monthly_returning_visits === null ? null : `returning_visits=${m.monthly_returning_visits}`
    ].filter(Boolean).join(', ')
  },
  {
    stage: 'TRUST',
    proximity: 6,
    known: m.google_review_flow_active !== null,
    problem: m.google_review_flow_active === false,
    evidence: m.google_review_flow_active === null ? '' : `review_flow_active=${m.google_review_flow_active}`
  },
  {
    stage: 'ATTRIBUTION',
    proximity: 8,
    known: m.attribution_ready !== null,
    problem: m.attribution_ready === false,
    evidence: m.attribution_ready === null ? '' : `attribution_ready=${m.attribution_ready}`
  }
];

const problems = checks
  .filter(x => x.known && x.problem)
  .sort((a, b) => b.proximity - a.proximity);

const unknowns = checks.filter(x => !x.known);

const status = x => !x.known ? 'UNKNOWN' : x.problem ? 'LEAK' : 'OK';

const lines = [
  '# Crown & Core — Gap Audit',
  '',
  `Period: ${state.period ?? 'unknown'}`,
  '',
  '## Customer path',
  '',
  '| Stage | Status | Evidence |',
  '|---|---|---|',
  ...checks.map(x => `| ${x.stage} | ${status(x)} | ${x.evidence || 'not measured'} |`),
  '',
  '## Closest known high-value leak',
  '',
  problems.length
    ? `**${problems[0].stage}** — ${problems[0].evidence || 'problem detected'}`
    : 'No ranked leak can be selected from current verified data.',
  '',
  '## Missing measurements',
  '',
  ...(unknowns.length ? unknowns.map(x => `- ${x.stage}`) : ['- None in the current rule set']),
  '',
  '## Next action',
  '',
  problems.length
    ? `Validate the ${problems[0].stage} leak with the owner and define one approval-gated test before building automation.`
    : 'Collect the missing baseline data before recommending a growth intervention.',
  '',
  '## Safety',
  '',
  '- Read-only diagnostic.',
  '- No customer communication.',
  '- No publishing.',
  '- No ad changes.',
  '- No spending.',
  '- No booking changes.'
];

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outPath, lines.join('\n') + '\n');
console.log(outPath);
