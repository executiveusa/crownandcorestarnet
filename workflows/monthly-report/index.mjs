import fs from 'node:fs';
import path from 'node:path';
import { readJson, writeText, arg, rootPath } from '../../lib/io.mjs';

const stateFile = arg('state', rootPath('data', 'current-state.json'));
const experimentsFile = arg('experiments', rootPath('districts', 'middleton', 'experiments', 'log.jsonl'));
const output = arg('out', rootPath('outbox', 'MONTHLY-OWNER-REPORT.md'));

const state = readJson(stateFile);
const m = state.metrics ?? {};

let experiments = [];
if (fs.existsSync(experimentsFile)) {
  experiments = fs.readFileSync(experimentsFile, 'utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .map(line => {
      try { return JSON.parse(line); } catch { return {status:'INVALID_LOG_LINE'}; }
    });
}

const value = v => v === null || v === undefined ? 'Not measured' : String(v);

const lines = [
  '# Crown & Core — Owner Report',
  '',
  `Period: ${state.period ?? 'unknown'}`,
  '',
  '## What we know',
  '',
  `- Bookings: ${value(m.monthly_bookings)}`,
  `- Completed visits: ${value(m.monthly_completed_visits)}`,
  `- Returning visits: ${value(m.monthly_returning_visits)}`,
  `- Dormant customers 90+ days: ${value(m.dormant_customers_90d_plus)}`,
  `- No-shows: ${value(m.monthly_no_shows)}`,
  `- Median lead response minutes: ${value(m.median_lead_response_minutes)}`,
  `- Missed calls: ${value(m.monthly_missed_calls)}`,
  `- Ad spend: ${value(m.monthly_ad_spend)}`,
  `- Attributable revenue: ${value(m.monthly_attributable_revenue)}`,
  '',
  '## Experiments',
  '',
  experiments.length
    ? ...experiments.map(x => `- ${x.id ?? 'unknown'} — ${x.status ?? 'unknown'} — ${x.decision ?? 'no decision'}`)
    : '- No experiment receipts logged.',
  '',
  '## What is still unknown',
  '',
  ...Object.entries(m).filter(([,v]) => v === null).map(([k]) => `- ${k}`),
  '',
  '## Decision rule',
  '',
  'Choose one next test from verified evidence. Do not add paid traffic to an unmeasured or broken conversion path.',
  '',
  '## Next owner decision',
  '',
  'Approve, change, or stop the single highest-value proposed test.'
];

writeText(output, lines.join('\n'));
console.log(output);
