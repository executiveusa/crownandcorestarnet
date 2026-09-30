import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const contracts=JSON.parse(fs.readFileSync(path.join(root,'_system','integrations','contracts.json'),'utf8'));
const priorities=['square','analytics','meta','google-business','communications','riverside','perspective','media-storage','public-web'];

const connectors=contracts.connectors.map(c=>{
  const missing=(c.required_env||[]).filter(k=>!process.env[k]);
  let readiness='READY_TO_SMOKE';
  if(c.status==='ready_no_auth') readiness='READY';
  else if(c.status==='blocked_provider_tbd') readiness='BLOCKED_PROVIDER_TBD';
  else if(missing.length) readiness='BLOCKED_MISSING_AUTH';
  return {
    id:c.id,
    mode:c.mode,
    districts:c.districts,
    readiness,
    missing_env:missing,
    purpose:c.purpose
  };
});

const ranked=[...connectors].sort((a,b)=>priorities.indexOf(a.id)-priorities.indexOf(b.id));
const next=ranked.find(x=>x.readiness!=='READY')||null;
const result={
  schema:'cc.live-readiness.v1',
  generated_at:new Date().toISOString(),
  proof_mode:true,
  secret_values_emitted:false,
  connectors,
  ready:connectors.filter(x=>x.readiness==='READY').map(x=>x.id),
  ready_to_smoke:connectors.filter(x=>x.readiness==='READY_TO_SMOKE').map(x=>x.id),
  blocked:connectors.filter(x=>x.readiness.startsWith('BLOCKED')).map(x=>({id:x.id,reason:x.readiness,missing_env:x.missing_env})),
  next_unlock:next?{id:next.id,reason:next.readiness,missing_env:next.missing_env,purpose:next.purpose}:null
};

const outJson=path.join(root,'outbox','LIVE-READINESS.json');
fs.mkdirSync(path.dirname(outJson),{recursive:true});
fs.writeFileSync(outJson,JSON.stringify(result,null,2)+'\n');

const lines=[
  '# Crown & Core — Live Readiness',
  '',
  `Generated: ${result.generated_at}`,
  '',
  '## Ready now',
  '',
  ...(result.ready.length?result.ready.map(x=>`- ${x}`):['- None']),
  '',
  '## Credentials present; smoke test still required',
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
    : 'No blocked connector remains.',
  '',
  'Presence is not proof of valid access. Any credential-bearing connector must pass its authenticated read-only smoke test before being marked live.'
];
const outMd=path.join(root,'districts','management','output','live-readiness.md');
fs.mkdirSync(path.dirname(outMd),{recursive:true});
fs.writeFileSync(outMd,lines.join('\n')+'\n');

console.log(`Ready: ${result.ready.join(', ')||'none'}`);
console.log(`Ready to smoke: ${result.ready_to_smoke.join(', ')||'none'}`);
console.log(`Blocked: ${result.blocked.length}`);
console.log(`Next unlock: ${result.next_unlock?.id||'none'}`);
