import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const evidencePath=path.join(root,'_shared','evidence','public-web-2026-09-28.json');
const outPath=path.join(root,'districts','conversion','output','PUBLIC-BASELINE.md');
const e=JSON.parse(fs.readFileSync(evidencePath,'utf8'));
const gaps=[...(e.observed_gaps||[])].sort((a,b)=>({high:3,medium:2,low:1}[b.severity]||0)-({high:3,medium:2,low:1}[a.severity]||0));
const f=e.verified_public_facts;
const lines=['# Crown & Core — Public Baseline','',`Observed: ${e.observed_at}`,'','## Verified public facts','',
`- Name: ${f.name}`,`- Address: ${f.address}`,`- Phone: ${f.phone}`,`- Website: ${f.website}`,
`- Public service areas: ${f.service_areas.join(', ')}`,`- Booking CTA visible: ${f.booking_cta_present}`,
'','## Observed public gaps','',...gaps.map(x=>`- [${x.severity.toUpperCase()}] ${x.id}: ${x.fact}`),
'','## Still unknown','',...(e.unknowns||[]).map(x=>`- ${x}`),'','## Decision','',
'Public evidence can justify a cleanup/verification queue, but authenticated business data is still required to choose the highest-value revenue intervention.'];
fs.mkdirSync(path.dirname(outPath),{recursive:true});
fs.writeFileSync(outPath,lines.join('\n')+'\n');
console.log(outPath);
