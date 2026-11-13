// Explicitly configured external renderer/publisher bridge. No guessed provider URLs.
// The existing Motion Master / Montage deployment must supply actual supported endpoints.
import { StudioError } from './domain.mjs';
const fail=(code,msg,status=409)=>{throw new StudioError(code,msg,status);};
function endpoint(raw){
  if(typeof raw!=='string'||!raw)throw new Error('Exact provider endpoint URL required.');
  const url=new URL(raw);
  if(url.username||url.password||url.hash||url.search)throw new Error('Provider URL must not contain credentials, query or fragment.');
  const loopback=['127.0.0.1','localhost'].includes(url.hostname);
  if(url.protocol!=='https:'&&!(loopback&&url.protocol==='http:'))
    throw new Error('Provider endpoint must be HTTPS or local loopback.');
  return url.href;
}
async function request(fetchFn,url,token,method,body,idempotency_key,timeoutMs){
  const response=await fetchFn(url,{
    method,redirect:'error',signal:AbortSignal.timeout(timeoutMs),
    headers:{authorization:'Bearer '+token,accept:'application/json',
      ...(method==='POST'?{'content-type':'application/json','idempotency-key':idempotency_key}:{})},
    ...(method==='POST'?{body:JSON.stringify(body)}:{})
  });
  if(!response.ok)fail('PROVIDER_HTTP_ERROR','Provider returned HTTP '+response.status,502);
  const length=Number(response.headers?.get?.('content-length')??0);
  if(length>32768)fail('PROVIDER_RESPONSE_TOO_LARGE','Provider response too large.',502);
  const value=await response.text();
  if(value.length>32768)fail('PROVIDER_RESPONSE_TOO_LARGE','Provider response too large.',502);
  try{return JSON.parse(value);}catch{fail('PROVIDER_INVALID_JSON','Provider did not return JSON.',502);}
}
export function createRendererAdapter({healthUrl,submitUrl,token,fetchFn=fetch,timeoutMs=10000}={}){
  const health=endpoint(healthUrl),submit=endpoint(submitUrl);
  if(new URL(health).origin!==new URL(submit).origin)throw new Error('Health and submit must share the approved provider origin.');
  if(typeof token!=='string'||token.length<24)throw new Error('Private renderer credential required.');
  return {
    inspect:async()=>{
      const result=await request(fetchFn,health,token,'GET',null,null,timeoutMs);
      if(!result||typeof result!=='object'||typeof result.version!=='string')
        fail('PROVIDER_UNVERIFIED','Provider health must report a version.',502);
      return {version:result.version,health_verified:true};
    },
    submit:async(plan,authorization,rights)=>{
      if(!plan||plan.status!=='DISPATCH_RESERVED'||!authorization||!rights)
        fail('NOT_AUTHORIZED','Reserved plan, owner budget authorization and verified rights required.');
      if(plan.job_id!==authorization.job_id||plan.version!==authorization.version||
        rights.version!==plan.version||rights.revoked||
        Date.parse(rights.expires_at)<=Date.now()||
        Date.parse(authorization.expires_at)<=Date.now())
        fail('AUTH_EXPIRED','Version, rights or budget authorization invalid.');
      if(plan.max_cost_usd<authorization.max_cost_usd)
        fail('INVALID_BUDGET','Budget exceeds approved plan.');
      const payload={job_id:plan.job_id,tenant_id:plan.tenant_id,
        destination:plan.provider,brief_ref:plan.outcome_id,
        asset_refs:plan.source_refs,rights_refs:plan.rights_refs,
        approved_claim_refs:plan.claim_refs,dimensions:plan.dimensions,
        cuts_seconds:plan.cuts_seconds,max_cost_usd:authorization.max_cost_usd,
        idempotency_key:plan.idempotency_key};
      const response=await request(fetchFn,submit,token,'POST',payload,plan.idempotency_key,timeoutMs);
      if(response?.accepted!==true||typeof response.provider_job_id!=='string'||
        !/^[a-z][a-z0-9._:-]{2,119}$/i.test(response.provider_job_id))
        fail('PROVIDER_NOT_ACCEPTED','Provider did not acknowledge the job.',502);
      return {accepted:true,provider_job_id:response.provider_job_id,
        job_id:plan.job_id,version:plan.version};
    }
  };
}
// The publication adapter is deliberately organic-only. Paid Meta ads are a
// separate product/review gate and are NOT exposed through this API.
export function createOrganicPublisher({publishUrl,token,fetchFn=fetch,timeoutMs=10000}={}){
  const url=endpoint(publishUrl);
  if(typeof token!=='string'||token.length<24)throw new Error('Private publisher credential required.');
  return {
    publish:async(item)=>{
      const a=item?.publication_authorization;
      if(item?.status!=='PUBLISH_AUTHORIZED'||!a||
        a.version!==item.version||a.paid_spend_usd!==0||
        Date.parse(a.expires_at)<=Date.now()||
        !item.final_approval||!item.qa?.verified||
        !item.rights_verification||Date.parse(item.rights_verification.expires_at)<=Date.now())
        fail('NOT_AUTHORIZED','Current film, rights and organic publication authorization required.');
      const payload={tenant_id:item.tenant_id,outcome_id:item.id,
        version:item.version,channel:a.channel,artifact_ref:item.qa.cuts[0].artifact_ref,
        sha256:a.hash_30,decision_ref:a.decision_ref,paid_spend_usd:0};
      const response=await request(fetchFn,url,token,'POST',payload,a.decision_ref,timeoutMs);
      if(response?.published!==true||typeof response.external_post_ref!=='string'||
        !/^[a-z][a-z0-9._:-]{2,119}$/i.test(response.external_post_ref))
        fail('PUBLISH_NOT_VERIFIED','Publisher did not confirm publication.',502);
      return {version:item.version,channel:a.channel,published_hash:a.hash_30,
        external_post_ref:response.external_post_ref,
        publication_receipt_ref:response.publication_receipt_ref};
    }
  };
}
