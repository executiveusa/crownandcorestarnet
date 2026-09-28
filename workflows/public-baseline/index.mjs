import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const evidencePath=path.join(root,'data','evidence','public-web-2026-09-28.json');
const outPath=path.join(root,'outbox','PUBLIC-BASELINE.md');
const e=JSON.parse(fs.readFileSync(evidencePath,'utf8'));

const gaps=[...(e.observed_gaps||[])].sort((a,b)=>{
  const rank={high:3,medium:2,low:1};
  return (rank[b.severity]||0)-(rank[a.severity]||0);
});

const lines=[
  '# Crown & Core — Public Baseline',
  '',
  `Observed: ${e.observed_at}`,
  '',
  '## Verified public facts',
  '',
  `- Name: ${e.verified_public_facts.name}`,
  `- Address: ${e.verified_public_facts.address}`,
  `- Phone: ${e.verified_public_facts.phone}`,
  `- Website: ${e.verified_public_facts.website}`,
  `- Public service areas: ${e.verified_public_facts.service_areas.join(', ')}`,
  `- Booking CTA visible: ${e.verified_public_facts.booking_cta_present}`,
  '',
  '## Observed public gaps',
  '',
  ...gaps.map(x=>`- [${x.severity.toUpperCase()}] ${x.id}: ${x.fact}`),
  '',
  '## Still unknown',
  '',
  ...(e.unknowns||[]).map(x=>`- ${x}`),
  '',
  '## Decision',
  '',
  'Public evidence is sufficient to justify a cleanup/verification queue, but not enough to choose the highest-value revenue intervention. Authenticated business data is still required.'
];

fs.mkdirSync(path.dirname(outPath),{recursive:true});
fs.writeFileSync(outPath,lines.join('\n')+'\n');
console.log(outPath);
