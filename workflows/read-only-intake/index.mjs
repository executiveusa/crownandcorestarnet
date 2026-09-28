import fs from 'node:fs';
import path from 'node:path';
import { normalizeSquare } from '../../integrations/normalize/square.mjs';
import { normalizeMeta } from '../../integrations/normalize/meta.mjs';
import { normalizeAnalytics } from '../../integrations/normalize/analytics.mjs';
import { normalizeCommunications } from '../../integrations/normalize/communications.mjs';

const root=process.cwd();
const args=Object.fromEntries(process.argv.slice(2).map(x=>{
  const i=x.indexOf('=');
  return i>0?[x.slice(2,i),x.slice(i+1)]:[x.replace(/^--/,''),'true'];
}));
const mode=args.mode||'fixture';
const apply=args.apply==='true';

if(mode!=='fixture'){
  throw new Error('Current intake workflow supports fixture proof only. Live connectors must be invoked through authenticated adapter-specific commands.');
}
if(apply){
  throw new Error('Synthetic fixture data may never be applied to data/current-state.json');
}

const read=name=>JSON.parse(fs.readFileSync(path.join(root,'test','fixtures','connectors',`${name}.json`),'utf8'));
const snapshots=[
  normalizeSquare(read('square'),{now:new Date('2026-09-28T12:00:00Z')}),
  normalizeMeta(read('meta')),
  normalizeAnalytics(read('analytics')),
  normalizeCommunications(read('communications'))
];

const baseline=JSON.parse(fs.readFileSync(path.join(root,'data','current-state.json'),'utf8'));
const candidate=structuredClone(baseline);
candidate.period='synthetic-fixture-proof';
candidate.provenance={
  synthetic:true,
  applied:false,
  warning:'This candidate is generated from synthetic fixtures and MUST NOT replace verified Crown & Core state.'
};

for(const snap of snapshots){
  for(const [key,value] of Object.entries(snap.metrics||{})){
    if(value!==null && key in candidate.metrics) candidate.metrics[key]=value;
  }
}

const output={
  schema:'cc.readonly.intake.proof.v1',
  generated_at:new Date().toISOString(),
  mode,
  applied:false,
  snapshots,
  candidate_state:candidate
};

const out=path.join(root,'outbox','READ-ONLY-INTAKE-PROOF.json');
fs.mkdirSync(path.dirname(out),{recursive:true});
fs.writeFileSync(out,JSON.stringify(output,null,2)+'\n');
console.log(`Read-only intake fixture proof generated from ${snapshots.length} connectors; applied=false.`);
