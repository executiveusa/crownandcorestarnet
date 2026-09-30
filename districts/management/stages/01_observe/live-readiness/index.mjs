import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root=process.cwd();
const priorities=['square','analytics','meta','google-business','communications','riverside','perspective','media-storage','public-web'];

const run=spawnSync(process.execPath,['_system/pipelines/data-readiness/index.mjs'],{
  cwd:root,
  encoding:'utf8',
  env:process.env
});
if(run.status!==0){
  process.stdout.write(run.stdout||'');
  process.stderr.write(run.stderr||'');
  process.exit(run.status||1);
}

const canonical=JSON.parse(fs.readFileSync(path.join(root,'outbox','DATA-READINESS.json'),'utf8'));
const ranked=[...canonical.connectors].sort((a,b)=>priorities.indexOf(a.id)-priorities.indexOf(b.id));
const next=ranked.find(x=>x.readiness!=='READY_NO_AUTH')||null;

const result={
  schema:'cc.live-readiness.v1',
  generated_at:new Date().toISOString(),
  source:'outbox/DATA-READINESS.json',
  proof_mode:true,
  secret_values_emitted:false,
  connectors:canonical.connectors,
  ready:canonical.ready,
  ready_to_smoke:canonical.ready_to_smoke,
  blocked:canonical.blocked,
  next_unlock:next?{id:next.id,reason:next.readiness,missing_env:next.missing_env,purpose:next.purpose}:null
};

const outJson=path.join(root,'outbox','LIVE-READINESS.json');
fs.writeFileSync(outJson,JSON.stringify(result,null,2)+'\n');

const lines=[
  '# Crown & Core — Live Readiness',
  '',
  `Generated: ${result.generated_at}`,
  '',
  '## Ready without credentials',
  '',
  ...(result.ready.length?result.ready.map(x=>`- ${x}`):['- None']),
  '',
  '## Credential present — authenticated smoke still required',
  '',
  ...(result.ready_to_smoke.length?result.ready_to_smoke.map(x=>`- ${x}`):['- None']),
  '',
  '## Blocked',
  '',
  ...(result.blocked.length?result.blocked.map(x=>`- ${x.id}: ${x.reason}${x.missing_env.length?` — missing ${x.missing_env.join(', ')}`:''}`):['- None']),
  '',
  '## Next unlock',
  '',
  result.next_unlock
    ? `**${result.next_unlock.id}** — ${result.next_unlock.purpose}. ${result.next_unlock.missing_env.length?`Needed: ${result.next_unlock.missing_env.join(', ')}.`:`Reason: ${result.next_unlock.reason}.`}`
    : 'No blocked or unverified connector remains.',
  '',
  'Credential presence is not proof of valid access. Any credential-bearing connector must pass its authenticated read-only smoke test before being treated as live.'
];
const outMd=path.join(root,'districts','management','output','live-readiness.md');
fs.mkdirSync(path.dirname(outMd),{recursive:true});
fs.writeFileSync(outMd,lines.join('\n')+'\n');

console.log(`Ready: ${result.ready.join(', ')||'none'}`);
console.log(`Ready to smoke: ${result.ready_to_smoke.join(', ')||'none'}`);
console.log(`Blocked: ${result.blocked.length}`);
console.log(`Next unlock: ${result.next_unlock?.id||'none'}`);
