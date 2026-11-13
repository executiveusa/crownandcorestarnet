// Creator sourcing and permission-first outreach; agent tools never send messages.
// No names, handles, email addresses or contact details in the public-safe domain.
import { createHash } from 'node:crypto';
import { StudioError } from './domain.mjs';
const deny=(code,msg,status=409)=>{throw new StudioError(code,msg,status);};
const ref=(v,n)=>{
  if(typeof v!=='string'||!/^[a-z][a-z0-9._:-]{2,119}$/i.test(v))
    deny('INVALID_REF',n+' must be an opaque non-personal reference.',400);
  return v;
};
const text=(v,n,max=600)=>{
  if(typeof v!=='string'||!v.trim()||v.length>max||
    /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}|(?:\+?\d[\d\s().-]{8,}\d)/i.test(v))
    deny('INVALID_CONTENT',n+' must be short and contain no contact details.',400);
  return v.trim();
};
const sha=v=>createHash('sha256').update(v).digest('hex');
export function createCreatorWorkflow(studio,{now=()=>new Date().toISOString()}={}){
  if(!studio?.applyTrusted)throw new Error('Trusted Studio store required.');
  function mutate(id,role,allowed,fn){
    if(role!==allowed)deny('FORBIDDEN',allowed+' role required.',403);
    return studio.applyTrusted(id,(item,receipt)=>{
      const event=fn(item);
      receipt(event,role);
    });
  }
  function proposeCandidate(id,role,input={}){
    return mutate(id,role,'agent',item=>{
      if(item.publication_receipt)deny('PUBLISHED_IMMUTABLE','New outcome required for creator campaign.');
      const creator_ref=ref(input.creator_ref,'creator_ref');
      const profile_ref=ref(input.profile_ref,'profile_ref');
      const fit_reason=text(input.fit_reason,'fit_reason',280);
      const candidates=item.creator_campaign?.candidates??[];
      if(candidates.length>=10)deny('CANDIDATE_LIMIT','Maximum ten candidates per outcome.');
      if(candidates.some(c=>c.creator_ref===creator_ref))deny('DUPLICATE_CANDIDATE','Candidate already proposed.');
      item.creator_campaign??={candidates:[],outreach:[]};
      item.creator_campaign.candidates.push({creator_ref,profile_ref,fit_reason,
        status:'PROPOSED_UNCONTACTED',at:now()});
      return 'creator_candidate_proposed_no_contact';
    });
  }
  function prepareOutreach(id,role,input={}){
    return mutate(id,role,'agent',item=>{
      const creator_ref=ref(input.creator_ref,'creator_ref');
      const candidate=item.creator_campaign?.candidates.find(c=>c.creator_ref===creator_ref);
      if(!candidate)deny('UNKNOWN_CREATOR','Candidate must be proposed first.');
      if(candidate.status!=='PROPOSED_UNCONTACTED')deny('OUTREACH_EXISTS','Outreach already exists.');
      const message=text(input.message,'message',600);
      if(/guaranteed results|patient testimonial|before.and.after|cure\b/i.test(message))
        deny('CLAIM_REVIEW_REQUIRED','Unapproved medical/endorsement claims in outreach.');
      const terms_ref=ref(input.terms_ref,'terms_ref');
      const max_fee_usd=input.max_fee_usd;
      if(typeof max_fee_usd!=='number'||!Number.isFinite(max_fee_usd)||
        max_fee_usd<0||max_fee_usd>1000)deny('INVALID_BUDGET','Invalid creator fee cap.',400);
      const outreach_id='outreach:'+sha(item.id+':'+creator_ref+':'+item.version).slice(0,32);
      item.creator_campaign.outreach.push({outreach_id,creator_ref,message,
        message_sha256:sha(message),terms_ref,max_fee_usd,status:'DRAFT_UNSENT',
        version:item.version,authorization:null,delivery:null});
      candidate.status='OUTREACH_DRAFT';
      return 'creator_outreach_prepared_unsent';
    });
  }
  function authorizeOutreach(id,role,input={}){
    return mutate(id,role,'owner',item=>{
      if(input.version!==item.version)deny('STALE_VERSION','Outreach approval must match creative version.');
      const outreach_id=ref(input.outreach_id,'outreach_id');
      const draft=item.creator_campaign?.outreach.find(x=>x.outreach_id===outreach_id);
      if(!draft||draft.status!=='DRAFT_UNSENT')deny('INVALID_STATE','No unsent outreach draft.');
      if(input.message_sha256!==draft.message_sha256)
        deny('STALE_MESSAGE','Approve exact message hash.');
      const permission_ref=ref(input.permission_ref,'permission_ref');
      const decision_ref=ref(input.decision_ref,'decision_ref');
      const expiry=Date.parse(input.expires_at);
      if(!Number.isFinite(expiry)||expiry<=Date.parse(now())||expiry>Date.parse(now())+7*86400000)
        deny('INVALID_EXPIRY','Approval must expire within seven days.');
      if(input.max_fee_usd!==draft.max_fee_usd)
        deny('FEE_MISMATCH','Approve the exact proposed fee cap.');
      draft.authorization={version:item.version,permission_ref,decision_ref,
        expires_at:input.expires_at,approved_at:now()};
      draft.status='OUTREACH_AUTHORIZED_UNSENT';
      return 'creator_outreach_exact_message_authorized';
    });
  }
  function reserveOutreach(id,role,input={}){
    return mutate(id,role,'operator',item=>{
      const draft=item.creator_campaign?.outreach.find(x=>x.outreach_id===input.outreach_id);
      if(!draft||draft.status!=='OUTREACH_AUTHORIZED_UNSENT')
        deny('NOT_AUTHORIZED','Only authorized unsent outreach can be reserved.');
      if(draft.version!==item.version||Date.parse(draft.authorization.expires_at)<=Date.parse(now()))
        deny('AUTH_EXPIRED','Outreach approval expired or creative changed.');
      draft.status='OUTREACH_RESERVED';
      return 'creator_outreach_reserved_no_retry';
    });
  }
  function recordSent(id,role,input={}){
    return mutate(id,role,'operator',item=>{
      const draft=item.creator_campaign?.outreach.find(x=>x.outreach_id===input.outreach_id);
      if(!draft||draft.status!=='OUTREACH_RESERVED')
        deny('NOT_AUTHORIZED','Reserved approved outreach required.');
      if(draft.version!==item.version||Date.parse(draft.authorization.expires_at)<=Date.parse(now()))
        deny('AUTH_EXPIRED','Outreach approval expired or revision changed.');
      const delivery_receipt_ref=ref(input.delivery_receipt_ref,'delivery_receipt_ref');
      const external_message_ref=ref(input.external_message_ref,'external_message_ref');
      draft.delivery={delivery_receipt_ref,external_message_ref,at:now()};
      draft.status='SENT_VERIFIED';
      const candidate=item.creator_campaign.candidates.find(c=>c.creator_ref===draft.creator_ref);
      candidate.status='CONTACTED';
      return 'creator_outreach_delivery_receipt_recorded';
    });
  }
  function recordRelease(id,role,input={}){
    return mutate(id,role,'rights',item=>{
      const creator_ref=ref(input.creator_ref,'creator_ref');
      const candidate=item.creator_campaign?.candidates.find(c=>c.creator_ref===creator_ref);
      if(!candidate)deny('UNKNOWN_CREATOR','Candidate not registered.');
      const release_ref=ref(input.release_ref,'release_ref');
      if(typeof input.release_sha256!=='string'||!/^[0-9a-f]{64}$/.test(input.release_sha256))
        deny('INVALID_HASH','Verified signed release hash required.',400);
      if(!['organic','paid','both'].includes(input.scope)||input.revoked!==false)
        deny('RIGHTS_SCOPE','Valid non-revoked rights scope required.');
      const expires=Date.parse(input.expires_at);
      if(!Number.isFinite(expires)||expires<=Date.parse(now()))
        deny('RIGHTS_EXPIRED','Creator release must be valid.');
      candidate.release={release_ref,release_sha256:input.release_sha256,
        scope:input.scope,expires_at:input.expires_at,verified_at:now(),revoked:false};
      candidate.status='RELEASE_VERIFIED';
      return 'creator_release_verified';
    });
  }
  return {proposeCandidate,prepareOutreach,authorizeOutreach,reserveOutreach,recordSent,recordRelease};
}
