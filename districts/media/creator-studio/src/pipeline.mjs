// Crown & Core Creator Studio — post-plan workflow. No network calls here.
// Only the API's distinct trusted service/reviewer roles may invoke these transitions.
import { createHash } from 'node:crypto';
import { StudioError, TENANT } from './domain.mjs';

const deny = (code, message, status=409) => { throw new StudioError(code,message,status); };
const roles = {
  rights: new Set(['rights']), owner: new Set(['owner']),
  operator: new Set(['operator']), qa: new Set(['qa']), publisher: new Set(['publisher'])
};
function needRole(role, required) {
  if (!roles[required].has(role)) deny('FORBIDDEN', required+' role required.',403);
}
function ref(value, name) {
  if (typeof value !== 'string' || !/^[a-z][a-z0-9._:-]{2,119}$/i.test(value))
    deny('INVALID_REF', name+' must be a non-personal opaque reference.',400);
  return value;
}
function hash(value, name) {
  if (typeof value !== 'string' || !/^[0-9a-f]{64}$/.test(value))
    deny('INVALID_HASH',name+' must be a SHA-256 digest.',400);
  return value;
}
function exact(item, version) {
  if (!Number.isInteger(version) || version !== item.version)
    deny('STALE_VERSION','Action must bind to the exact current creative revision.');
}
function inState(item, ...states) {
  if (!states.includes(item.status)) deny('INVALID_STATE','Action unavailable in state '+item.status+'.');
}
function positiveCap(value, max=1000) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value<0 || value>max)
    deny('INVALID_BUDGET','Invalid capped USD amount.',400);
  return value;
}
function timestamp(value, now, maxDays=7) {
  const t=Date.parse(value);
  if (typeof value!=='string' || !Number.isFinite(t) || t<=Date.parse(now()) || t>Date.parse(now())+maxDays*86400000)
    deny('INVALID_EXPIRY','Expiry must be in the next seven days.',400);
  return value;
}
const digest = v => createHash('sha256').update(JSON.stringify(v)).digest('hex');
export function createPipeline(studio, { now=()=>new Date().toISOString(), actorRef=null }={}) {
  if (typeof studio?.applyTrusted !== 'function') throw new Error('Trusted Studio store required.');
  const change=(id, role, expectedRole, fn)=>{
    needRole(role,expectedRole);
    return studio.applyTrusted(id,(item,receipt)=>{
      if(item.tenant_id!==TENANT)deny('TENANT_DENIED','Tenant mismatch.',403);
      const event=fn(item);
      receipt(event,role,actorRef);
    });
  };
  function verifyRights(id, role, input={}) {
    return change(id,role,'rights',item=>{
      inState(item,'RENDER_PLAN_READY');
      exact(item,input.version);
      if(!item.source || item.render_plan?.version!==item.version)deny('NOT_READY','Source and current plan required.');
      if(input.rights_ref!==item.source.rights_ref)deny('RIGHTS_MISMATCH','Rights reference mismatch.');
      const grant_ref=ref(input.grant_ref,'grant_ref');
      const grant_sha256=hash(input.grant_sha256,'grant_sha256');
      const asset_sha256=hash(input.asset_sha256,'asset_sha256');
      const scope=input.scope;
      if(!['organic','paid','both'].includes(scope))deny('RIGHTS_SCOPE','Invalid grant scope.',400);
      if(item.source.usage_scope==='both'&&scope!=='both')deny('RIGHTS_SCOPE','Actual grant must cover both declared uses.');
      if(item.source.usage_scope==='paid'&&scope==='organic')deny('RIGHTS_SCOPE','Paid scope not verified.');
      if(item.source.usage_scope==='organic'&&scope==='paid')deny('RIGHTS_SCOPE','Organic scope not verified.');
      if(input.revoked!==false)deny('RIGHTS_REVOKED','Revoked or unknown grant cannot be used.');
      const expires_at=timestamp(input.expires_at,now,365);
      item.rights_verification={version:item.version,grant_ref,grant_sha256,asset_sha256,
        rights_ref:input.rights_ref,scope,expires_at,verified_at:now(),revoked:false};
      return 'rights_grant_verified';
    });
  }
  function authorizeRender(id,role,input={}) {
    return change(id,role,'owner',item=>{
      inState(item,'RENDER_PLAN_READY');
      exact(item,input.version);
      const rights=item.rights_verification;
      if(!rights || rights.version!==item.version || Date.parse(rights.expires_at)<=Date.parse(now()) || rights.revoked)
        deny('RIGHTS_NOT_VERIFIED','Independent current rights grant required.');
      if(item.approvals.owner?.version!==item.version ||
        (item.storyboard.claims_present&&item.approvals.clinical?.version!==item.version))
        deny('NOT_APPROVED','Storyboard and claims approval required.');
      const max_cost_usd=positiveCap(input.max_cost_usd,item.render_plan.max_cost_usd);
      const decision_ref=ref(input.decision_ref,'decision_ref');
      const expires_at=timestamp(input.expires_at,now);
      item.render_authorization={version:item.version,job_id:item.render_plan.job_id,
        decision_ref,max_cost_usd,expires_at,authorized_at:now()};
      item.status='RENDER_AUTHORIZED';
      return 'render_cost_authorized';
    });
  }
  function reserveDispatch(id,role,input={}) {
    return change(id,role,'operator',item=>{
      inState(item,'RENDER_AUTHORIZED');
      exact(item,input.version);
      if(item.render_plan.job_id!==input.job_id)deny('JOB_MISMATCH','Job mismatch.');
      if(!item.render_authorization || Date.parse(item.render_authorization.expires_at)<=Date.parse(now()))
        deny('AUTH_EXPIRED','Render authorization expired.');
      if(!item.rights_verification || Date.parse(item.rights_verification.expires_at)<=Date.parse(now()))
        deny('RIGHTS_EXPIRED','Source rights expired.');
      item.status='DISPATCH_RESERVED';
      item.render_plan.status='DISPATCH_RESERVED';
      // Provider submission must happen outside this transaction, using the reserved job ID.
      // Never blindly retry if an acknowledgement is lost: reconcile provider-side first.
      return 'render_dispatch_reserved';
    });
  }
  function acknowledgeProvider(id,role,input={}) {
    return change(id,role,'operator',item=>{
      inState(item,'DISPATCH_RESERVED');
      exact(item,input.version);
      if(item.render_plan.job_id!==input.job_id)deny('JOB_MISMATCH','Job mismatch.');
      const provider_job_id=ref(input.provider_job_id,'provider_job_id');
      if(input.accepted!==true)deny('PROVIDER_NOT_ACCEPTED','Provider did not accept job.');
      item.render_plan.provider_job_id=provider_job_id;
      item.render_plan.status='RUNNING';
      item.status='RENDERING';
      return 'provider_job_acknowledged';
    });
  }
  function providerResult(id,role,input={}) {
    return change(id,role,'operator',item=>{
      inState(item,'RENDERING');
      exact(item,input.version);
      if(input.job_id!==item.render_plan.job_id || input.provider_job_id!==item.render_plan.provider_job_id)
        deny('JOB_MISMATCH','Provider result does not match accepted job.');
      const cost=positiveCap(input.cost_actual_usd,item.render_authorization.max_cost_usd);
      if(input.status!=='rendered')deny('INVALID_RESULT','Provider must report rendered; use failure path otherwise.');
      if(!Array.isArray(input.artifacts)||input.artifacts.length!==2)
        deny('ARTIFACTS_MISSING','Both 30s and 15s provider artifacts required.');
      const cuts=input.artifacts.map(a=>({
        cut_seconds: a.cut_seconds, artifact_ref:ref(a.artifact_ref,'artifact_ref'),
        sha256:hash(a.sha256,'sha256')
      }));
      if(cuts[0].cut_seconds!==30||cuts[1].cut_seconds!==15||
        cuts[0].artifact_ref===cuts[1].artifact_ref)
        deny('INVALID_CUTS','Expected distinct ordered 30s and 15s cuts.');
      const receipt_ref=ref(input.provider_receipt_ref,'provider_receipt_ref');
      item.provider_receipt={version:item.version,provider_job_id:input.provider_job_id,
        provider_receipt_ref:receipt_ref,artifacts:cuts,cost_actual_usd:cost,received_at:now(),
        qa_verified:false};
      item.status='RENDERED';
      item.render_plan.status='RENDERED';
      return 'provider_render_reported_unverified';
    });
  }
  function verifyQa(id,role,input={}) {
    return change(id,role,'qa',item=>{
      inState(item,'RENDERED');
      exact(item,input.version);
      if(input.job_id!==item.render_plan.job_id)deny('JOB_MISMATCH','Job mismatch.');
      if(input.verified!==true || !Array.isArray(input.cuts)||input.cuts.length!==2)
        deny('QA_FAILED','Independent QA of both files required.');
      const expected=item.provider_receipt.artifacts;
      const cuts=input.cuts.map((a,i)=>{
        if(a.cut_seconds!==expected[i].cut_seconds || a.artifact_ref!==expected[i].artifact_ref ||
          a.sha256!==expected[i].sha256 || a.width!==1080 || a.height!==1920 ||
          typeof a.duration_seconds!=='number' || Math.abs(a.duration_seconds-a.cut_seconds)>0.6 ||
          !Number.isSafeInteger(a.size_bytes) || a.size_bytes<1024)
          deny('QA_FAILED','Artifact hash, dimensions, duration or size mismatch.');
        return {cut_seconds:a.cut_seconds,artifact_ref:a.artifact_ref,
          sha256:hash(a.sha256,'sha256'),width:1080,height:1920,
          duration_seconds:a.duration_seconds,size_bytes:a.size_bytes};
      });
      const qa_ref=ref(input.qa_ref,'qa_ref');
      item.qa={version:item.version,job_id:input.job_id,verified:true,cuts,
        qa_ref,report_sha256:digest(cuts),verified_at:now()};
      item.status='READY_FOR_FINAL_REVIEW';
      return 'independent_video_qa_verified';
    });
  }
  function decideFinal(id,role,input={}) {
    return change(id,role,'owner',item=>{
      inState(item,'READY_FOR_FINAL_REVIEW');
      exact(item,input.version);
      if(input.decision!=='approve')deny('INVALID_DECISION','Only explicit approval is accepted; request a new revision for changes.');
      const hash30=hash(input.hash_30,'hash_30'),hash15=hash(input.hash_15,'hash_15');
      if(item.qa?.cuts[0].sha256!==hash30 || item.qa?.cuts[1].sha256!==hash15)
        deny('STALE_ARTIFACT','Exact QA-verified film hashes must be approved.');
      const decision_ref=ref(input.decision_ref,'decision_ref');
      item.final_approval={version:item.version,decision_ref,hash_30:hash30,hash_15:hash15,at:now()};
      item.status='FILM_APPROVED';
      return 'final_film_approved_exact_hashes';
    });
  }
  function authorizePublish(id,role,input={}) {
    return change(id,role,'owner',item=>{
      inState(item,'FILM_APPROVED');
      exact(item,input.version);
      if(!item.final_approval || item.qa?.version!==item.version)
        deny('NOT_APPROVED','Verified final film approval required.');
      if(!item.rights_verification || item.rights_verification.revoked ||
        Date.parse(item.rights_verification.expires_at)<=Date.parse(now()))
        deny('RIGHTS_EXPIRED','Rights must still be valid.');
      if(item.rights_verification.scope==='paid')
        deny('RIGHTS_SCOPE','Organic publication rights not verified.');
      if(input.channel!==item.placement || !['instagram_reel','facebook_reel','youtube_short','organic_video'].includes(input.channel))
        deny('CHANNEL_MISMATCH','Channel must match approved placement.');
      if(input.booking_path_verified!==true && item.goal!=='owned_media')
        deny('BOOKING_PATH','Verify the booking path before publication.');
      if(input.claim_policy_verified!==true)
        deny('CLAIM_POLICY','Qualified policy review required.');
      const decision_ref=ref(input.decision_ref,'decision_ref');
      const expires_at=timestamp(input.expires_at,now);
      item.publication_authorization={version:item.version,decision_ref,channel:input.channel,
        expires_at,hash_30:item.qa.cuts[0].sha256,hash_15:item.qa.cuts[1].sha256,
        paid_spend_usd:0,authorized_at:now()};
      item.status='PUBLISH_AUTHORIZED';
      return 'organic_publication_separately_authorized';
    });
  }
  function reservePublication(id,role,input={}) {
    return change(id,role,'publisher',item=>{
      inState(item,'PUBLISH_AUTHORIZED');
      exact(item,input.version);
      if(input.decision_ref!==item.publication_authorization?.decision_ref)
        deny('DECISION_MISMATCH','Publication authorization mismatch.');
      if(Date.parse(item.publication_authorization.expires_at)<=Date.parse(now()))
        deny('AUTH_EXPIRED','Publication authorization expired.');
      if(!item.rights_verification || item.rights_verification.revoked ||
        Date.parse(item.rights_verification.expires_at)<=Date.parse(now()))
        deny('RIGHTS_EXPIRED','Rights expired or revoked.');
      item.status='PUBLISH_RESERVED';
      return 'organic_publication_reserved_no_retry';
    });
  }
  function published(id,role,input={}) {
    return change(id,role,'publisher',item=>{
      inState(item,'PUBLISH_RESERVED');
      exact(item,input.version);
      const auth=item.publication_authorization;
      if(Date.parse(auth.expires_at)<=Date.parse(now()))deny('AUTH_EXPIRED','Publication approval expired.');
      if(input.channel!==auth.channel || input.published_hash!==auth.hash_30)
        deny('PUBLICATION_MISMATCH','Channel or exact approved video hash mismatch.');
      if(!item.rights_verification || Date.parse(item.rights_verification.expires_at)<=Date.parse(now()))
        deny('RIGHTS_EXPIRED','Rights expired before publication.');
      const external_post_ref=ref(input.external_post_ref,'external_post_ref');
      const publication_receipt_ref=ref(input.publication_receipt_ref,'publication_receipt_ref');
      item.publication_receipt={version:item.version,channel:auth.channel,external_post_ref,
        publication_receipt_ref,hash_30:auth.hash_30,at:now(),paid_spend_usd:0};
      item.status='PUBLISHED_VERIFIED';
      return 'organic_publication_receipt_verified';
    });
  }
  function attribute(id,role,input={}) {
    return change(id,role,'operator',item=>{
      inState(item,'PUBLISHED_VERIFIED');
      exact(item,input.version);
      if(input.verified_source!==true)deny('UNVERIFIED_METRICS','Source-backed attribution required.');
      const source_ref=ref(input.source_ref,'source_ref');
      if(!Number.isSafeInteger(input.bookings)||input.bookings<0||input.bookings>100000)
        deny('INVALID_METRIC','Invalid aggregate bookings.',400);
      const revenue_usd=positiveCap(input.revenue_usd,10000000);
      const event_ref=ref(input.event_ref,'event_ref');
      item.attribution_events??=[];
      if(item.attribution_events.some(e=>e.event_ref===event_ref))
        deny('DUPLICATE_EVENT','Event already recorded.');
      if(item.attribution_events.length>=1000)
        deny('EVENT_LIMIT','Attribution history requires archival before further ingestion.');
      item.attribution_events.push({event_ref,source_ref,bookings:input.bookings,
        revenue_usd,verified_at:now()});
      item.attribution={version:item.version,event_ref,source_ref,
        bookings:item.attribution_events.reduce((sum,e)=>sum+e.bookings,0),
        revenue_usd:item.attribution_events.reduce((sum,e)=>sum+e.revenue_usd,0),
        verified_at:now()};
      return 'verified_aggregate_attribution_recorded';
    });
  }
  function failJob(id,role,input={}) {
    return change(id,role,'operator',item=>{
      inState(item,'DISPATCH_RESERVED','RENDERING','RENDERED');
      exact(item,input.version);
      const error_ref=ref(input.error_ref,'error_ref');
      item.failure={version:item.version,error_ref,at:now()};
      item.status='FAILED';
      return 'production_failed_no_success_claim';
    });
  }
  // Rights revocation is not an ordinary creative edit: published content must
  // remain visible in the audit and be explicitly removed by a trusted publisher.
  function revokeRights(id,role,input={}) {
    return change(id,role,'rights',item=>{
      exact(item,input.version);
      if(!item.source||input.rights_ref!==item.source.rights_ref)
        deny('RIGHTS_MISMATCH','Rights reference mismatch.');
      const revocation_ref=ref(input.revocation_ref,'revocation_ref');
      item.rights_verification={...(item.rights_verification??{}),version:item.version,
        revoked:true,revocation_ref,revoked_at:now()};
      item.render_authorization=null;
      item.publication_authorization=null;
      item.status=item.publication_receipt?'TAKEDOWN_REQUIRED':'RIGHTS_REVOKED';
      return 'source_rights_revoked_block_future_use';
    });
  }
  function recordTakedown(id,role,input={}) {
    return change(id,role,'publisher',item=>{
      inState(item,'TAKEDOWN_REQUIRED');
      exact(item,input.version);
      if(input.external_post_ref!==item.publication_receipt?.external_post_ref)
        deny('POST_MISMATCH','Takedown receipt does not match published post.');
      const takedown_receipt_ref=ref(input.takedown_receipt_ref,'takedown_receipt_ref');
      item.takedown={version:item.version,takedown_receipt_ref,at:now()};
      item.status='TAKEN_DOWN';
      return 'revoked_media_takedown_verified';
    });
  }
  return {verifyRights,authorizeRender,reserveDispatch,acknowledgeProvider,
    providerResult,verifyQa,decideFinal,authorizePublish,reservePublication,published,attribute,failJob,
    revokeRights,recordTakedown};
}
