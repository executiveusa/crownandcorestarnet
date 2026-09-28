import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const contracts=JSON.parse(fs.readFileSync(path.join(root,'integrations','contracts.json'),'utf8'));
const outPath=path.join(root,'outbox','DATA-READINESS.json');

const connectors=contracts.connectors.map(c=>{
  const missing=(c.required_env||[]).filter(k=>!process.env[k]);
  let readiness='READY';
  if(c.status==='blocked_provider_tbd') readiness='BLOCKED_PROVIDER_TBD';
  else if(missing.length) readiness='BLOCKED_MISSING_AUTH';
  else if(c.status==='ready_no_auth') readiness='READY';
  return {
    id:c.id,
    mode:c.mode,
    districts:c.districts,
    readiness,
    missing_env:missing,
    purpose:c.purpose
  };
});

const result={
  generated_at:new Date().toISOString(),
  proof_mode:true,
  ready:connectors.filter(x=>x.readiness==='READY').map(x=>x.id),
  blocked:connectors.filter(x=>x.readiness!=='READY').map(x=>({id:x.id,reason:x.readiness,missing_env:x.missing_env})),
  connectors
};
fs.mkdirSync(path.dirname(outPath),{recursive:true});
fs.writeFileSync(outPath,JSON.stringify(result,null,2)+'\n');
console.log(`Ready connectors: ${result.ready.join(', ')||'none'}`);
console.log(`Blocked connectors: ${result.blocked.length}`);
