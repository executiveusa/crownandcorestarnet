// Explicit operator CLI. No cron, background scheduler, retries or autonomous publishing.
// Connects only to a loopback Creator Studio API and exact configured external provider URLs.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRendererAdapter, createOrganicPublisher, createCreatorOutreachAdapter } from './adapters.mjs';
import { inspectVideoCuts } from './qa.mjs';

function apiOrigin(env){
  const u=new URL(env.CREATOR_STUDIO_API_URL??'http://127.0.0.1:8787');
  if(u.protocol!=='http:'||!['127.0.0.1','localhost'].includes(u.hostname)||
    u.username||u.password||u.search||u.hash||u.pathname!=='/')
    throw new Error('Operator API must be loopback only.');
  return u.origin;
}
async function api(env,role,method,path,body){
  const token=env['CREATOR_STUDIO_'+role.toUpperCase()+'_TOKEN'];
  if(!token)throw new Error('Missing private '+role+' credential.');
  const res=await fetch(apiOrigin(env)+path,{method,redirect:'error',
    headers:{authorization:'Bearer '+token,...(body?{'content-type':'application/json'}:{})},
    ...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(12000)});
  const data=await res.json();
  if(!res.ok)throw new Error('Creator Studio '+String(data.error??'request denied'));
  return data;
}
const outcomePath=id=>'/v1/outcomes/'+encodeURIComponent(id);
function getEnv(env,name){if(!env[name])throw new Error('Missing configured '+name);return env[name];}
export async function inspectRenderer(env=process.env,fetchFn=fetch){
  const adapter=createRendererAdapter({healthUrl:getEnv(env,'CREATOR_RENDER_HEALTH_URL'),
    submitUrl:getEnv(env,'CREATOR_RENDER_SUBMIT_URL'),
    token:getEnv(env,'CREATOR_RENDER_TOKEN'),fetchFn});
  return adapter.inspect();
}
export async function dispatchApproved(id,env=process.env,fetchFn=fetch){
  // Do not reserve before verifying the real provider's health.
  const adapter=createRendererAdapter({healthUrl:getEnv(env,'CREATOR_RENDER_HEALTH_URL'),
    submitUrl:getEnv(env,'CREATOR_RENDER_SUBMIT_URL'),
    token:getEnv(env,'CREATOR_RENDER_TOKEN'),fetchFn});
  await adapter.inspect();
  const item=(await api(env,'operator','GET',outcomePath(id))).outcome;
  if(item.status!=='RENDER_AUTHORIZED')throw new Error('Render not authorized.');
  const plan=item.render_plan,authorization=item.render_authorization,rights=item.rights_verification;
  const reserved=(await api(env,'operator','POST',outcomePath(id)+'/dispatch-reserve',
    {version:item.version,job_id:plan.job_id})).outcome;
  // If submission succeeds but the acknowledgement fails, STOP and reconcile provider
  // by the idempotency key. Never auto-resubmit a possibly billed job.
  const response=await adapter.submit(reserved.render_plan,authorization,rights);
  return (await api(env,'operator','POST',outcomePath(id)+'/provider-ack',
    {version:item.version,job_id:plan.job_id,provider_job_id:response.provider_job_id,accepted:true})).outcome;
}
export async function verifyApprovedCuts(id,manifestPath,env=process.env){
  const item=(await api(env,'qa','GET',outcomePath(id))).outcome;
  if(item.status!=='RENDERED')throw new Error('Provider has not reported rendered files.');
  const manifest=JSON.parse(readFileSync(manifestPath,'utf8'));
  if(manifest.outcome_id!==id||manifest.job_id!==item.render_plan.job_id)
    throw new Error('Manifest job mismatch.');
  const expected=item.provider_receipt.artifacts;
  if(!Array.isArray(manifest.files)||manifest.files.length!==2)
    throw new Error('Both cuts required.');
  const files=manifest.files.map((f,i)=>{
    if(f.artifact_ref!==expected[i].artifact_ref||f.cut_seconds!==expected[i].cut_seconds)
      throw new Error('Provider artifact mismatch.');
    return {...f,expected_sha256:expected[i].sha256};
  });
  const qa=await inspectVideoCuts({vaultRoot:getEnv(env,'CREATOR_PRIVATE_MEDIA_VAULT'),files});
  const qa_ref=manifest.qa_ref;
  return (await api(env,'qa','POST',outcomePath(id)+'/qa-verify',
    {version:item.version,job_id:item.render_plan.job_id,qa_ref,
      verified:qa.verified,cuts:qa.cuts})).outcome;
}
export async function publishApprovedOrganic(id,env=process.env,fetchFn=fetch){
  if(env.CREATOR_STUDIO_ENABLE_ORGANIC_PUBLISH!=='yes')
    throw new Error('Organic publication is disabled by default; separate owner/operator release required.');
  const item=(await api(env,'publisher','GET',outcomePath(id))).outcome;
  if(item.status!=='PUBLISH_AUTHORIZED')throw new Error('No exact-version publication authorization.');
  const adapter=createOrganicPublisher({publishUrl:getEnv(env,'CREATOR_PUBLISH_URL'),
    token:getEnv(env,'CREATOR_PUBLISH_TOKEN'),fetchFn});
  const reserved=(await api(env,'publisher','POST',outcomePath(id)+'/publish-reserve',
    {version:item.version,decision_ref:item.publication_authorization.decision_ref})).outcome;
  // A lost acknowledgement leaves PUBLISH_RESERVED: reconcile provider-side, never auto-retry.
  const receipt=await adapter.publish(reserved);
  return (await api(env,'publisher','POST',outcomePath(id)+'/publish-receipt',receipt)).outcome;
}
export async function sendApprovedCreatorOutreach(id,outreach_id,env=process.env,fetchFn=fetch){
  if(env.CREATOR_STUDIO_ENABLE_CREATOR_OUTREACH!=='yes')
    throw new Error('Creator outreach disabled; explicit owner/operator release required.');
  const item=(await api(env,'operator','GET',outcomePath(id))).outcome;
  const adapter=createCreatorOutreachAdapter({sendUrl:getEnv(env,'CREATOR_OUTREACH_SEND_URL'),
    token:getEnv(env,'CREATOR_OUTREACH_TOKEN'),fetchFn});
  const reserved=(await api(env,'operator','POST',outcomePath(id)+'/creator-outreach-reserve',
    {outreach_id})).outcome;
  // A lost acknowledgement leaves OUTREACH_RESERVED. Reconcile, never auto-retry.
  const receipt=await adapter.send(reserved,outreach_id);
  return (await api(env,'operator','POST',outcomePath(id)+'/creator-outreach-sent',receipt)).outcome;
}
async function main(args,env){
  const [command,id,manifest]=args;
  if(command==='inspect'){
    const status=await inspectRenderer(env);
    console.log(JSON.stringify({provider_health_verified:true,version:status.version}));
  }else if(command==='dispatch'&&id){
    const item=await dispatchApproved(id,env);
    console.log(JSON.stringify({outcome_id:item.id,status:item.status,
      provider_job_id:item.render_plan.provider_job_id}));
  }else if(command==='qa'&&id&&manifest){
    const item=await verifyApprovedCuts(id,manifest,env);
    console.log(JSON.stringify({outcome_id:item.id,status:item.status,qa_ref:item.qa.qa_ref}));
  }else if(command==='publish'&&id){
    const item=await publishApprovedOrganic(id,env);
    console.log(JSON.stringify({outcome_id:item.id,status:item.status,
      publication_receipt_ref:item.publication_receipt.publication_receipt_ref}));
  }else if(command==='outreach'&&id&&manifest){
    const item=await sendApprovedCreatorOutreach(id,manifest,env);
    console.log(JSON.stringify({outcome_id:item.id,outreach_id:manifest,status:'SENT_VERIFIED'}));
  }else throw new Error('Usage: node worker.mjs inspect | dispatch <outcome-id> | qa <outcome-id> <private-manifest.json> | publish <outcome-id> | outreach <outcome-id> <outreach-id>');
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  main(process.argv.slice(2),process.env).catch(e=>{
    // Never print provider request bodies, private paths or credentials.
    console.error('Creator Studio operator blocked:',e?.code??e?.name??'Error');
    process.exitCode=1;
  });
}
