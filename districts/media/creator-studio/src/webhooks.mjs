// Signed callback envelope for verified renderer/booking-source bridges.
// Raw request body is signed; no query-string secrets, no unsigned events.
import { createHmac, timingSafeEqual } from 'node:crypto';
import { StudioError } from './domain.mjs';
const deny=(code,msg,status=401)=>{throw new StudioError(code,msg,status);};
export function verifySignedEvent({raw,headers,secret,now=()=>Date.now(),maxSkewMs=300000}={}){
  if(typeof secret!=='string'||secret.length<32)throw new Error('Private 32+ character webhook secret required.');
  if(typeof raw!=='string'||raw.length>16384)deny('WEBHOOK_INVALID','Body missing or too large.',413);
  const timestamp=headers?.['x-studio-timestamp'];
  const event_id=headers?.['x-studio-event-id'];
  const signature=headers?.['x-studio-signature'];
  if(typeof timestamp!=='string'||!/^[0-9]{10,13}$/.test(timestamp)||
    typeof event_id!=='string'||!/^[a-z][a-z0-9._:-]{2,119}$/i.test(event_id)||
    typeof signature!=='string'||!/^[0-9a-f]{64}$/.test(signature))
    deny('WEBHOOK_SIGNATURE','Signed event headers required.');
  const time=Number(timestamp);
  const ms=timestamp.length===10?time*1000:time;
  if(!Number.isFinite(ms)||Math.abs(now()-ms)>maxSkewMs)
    deny('WEBHOOK_EXPIRED','Event timestamp expired.');
  const expected=createHmac('sha256',secret).update(timestamp+'.'+event_id+'.'+raw).digest('hex');
  if(!timingSafeEqual(Buffer.from(signature,'hex'),Buffer.from(expected,'hex')))
    deny('WEBHOOK_SIGNATURE','Invalid event signature.');
  let body;
  try{body=JSON.parse(raw);}catch{deny('WEBHOOK_INVALID','Invalid JSON.',400);}
  if(!body||typeof body!=='object'||Array.isArray(body))
    deny('WEBHOOK_INVALID','Event object required.',400);
  if(body.event_ref!==event_id)
    deny('WEBHOOK_MISMATCH','Signed event ID must match payload.',409);
  return body;
}
