import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { verifySignedEvent } from '../src/webhooks.mjs';
import { createStudio } from '../src/domain.mjs';
import { createPipeline } from '../src/pipeline.mjs';
import { createApiServer } from '../src/api.mjs';

const secret='private-webhook-secret-at-least-32-characters';
function envelope(body,when=Date.now()){
  const raw=JSON.stringify(body),timestamp=String(when),event_id=body.event_ref;
  const signature=createHmac('sha256',secret).update(timestamp+'.'+event_id+'.'+raw).digest('hex');
  return {raw,headers:{'x-studio-timestamp':timestamp,
    'x-studio-event-id':event_id,'x-studio-signature':signature}};
}
test('signed callback verifies raw payload, timestamp and event ID',()=>{
  const event={event_ref:'event:one',version:1};
  const signed=envelope(event);
  assert.equal(verifySignedEvent({...signed,secret}).event_ref,'event:one');
  assert.throws(()=>verifySignedEvent({...signed,raw:signed.raw+' ',secret}),e=>e.code==='WEBHOOK_SIGNATURE');
  assert.throws(()=>verifySignedEvent({...envelope(event,Date.now()-400000),secret}),e=>e.code==='WEBHOOK_EXPIRED');
  assert.throws(()=>verifySignedEvent({...envelope({...event,event_ref:'event:other'}),
    headers:signed.headers,secret}),e=>e.code==='WEBHOOK_SIGNATURE');
});
test('unauthenticated provider webhook is rejected before state changes',async t=>{
  const studio=createStudio();
  const item=studio.create({outcome:'Create an approved Crown & Core film'});
  const server=createApiServer({studio,tokens:{agent:'a'.repeat(30),owner:'b'.repeat(30)},
    webhookSecrets:{provider:secret,attribution:secret}});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  const base='http://127.0.0.1:'+server.address().port+'/v1/webhooks/provider/'+item.id;
  const payload={event_ref:'event:one',outcome_id:item.id,version:item.version};
  const unsigned=await fetch(base,{method:'POST',
    headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
  assert.equal(unsigned.status,401);
  const signed=envelope(payload);
  const response=await fetch(base,{method:'POST',headers:{
    'content-type':'application/json',...signed.headers},body:signed.raw});
  assert.equal(response.status,409); // valid signature, but no approved/rendering job
  assert.equal(studio.get(item.id).status,'DRAFT');
});

test('signed callback cannot be replayed into another outcome URL',async t=>{
  const studio=createStudio();
  const one=studio.create({outcome:'First actual campaign'});
  const two=studio.create({outcome:'Second actual campaign'});
  const server=createApiServer({studio,tokens:{agent:'a'.repeat(30),owner:'b'.repeat(30)},
    webhookSecrets:{provider:secret,attribution:secret}});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  const payload={event_ref:'event:cross',outcome_id:one.id,version:one.version,
    verified_source:true,source_ref:'booking:source',bookings:2,revenue_usd:100};
  const signed=envelope(payload);
  const base='http://127.0.0.1:'+server.address().port+'/v1/webhooks/attribution/';
  const response=await fetch(base+two.id,{method:'POST',headers:{
    'content-type':'application/json',...signed.headers},body:signed.raw});
  assert.equal(response.status,409);
  assert.equal((await response.json()).error,'WEBHOOK_OUTCOME_MISMATCH');
  assert.equal(studio.get(two.id).attribution,undefined);
});
