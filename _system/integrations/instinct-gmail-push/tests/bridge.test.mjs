import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createServer} from 'node:http';
import {generateKeyPairSync,sign} from 'node:crypto';
import {openStore,parseReply,verifyPushJwt,parsePushEnvelope} from '../src/core.mjs';
import {createBridge} from '../src/server.mjs';
import {gmailClient} from '../src/gmail.mjs';

const mission='CC-A2A-TEST-001',thread='1a1d71f109f77f87',gmailId='1a1d71f109f77fff';
const mailbox='executiveusa@gmail.com',sender='cityops@mail.instinct.com';
const sub='projects/example-project/subscriptions/instinct-mail-push';
const config={mailbox,sender,pubsubSubscription:sub,pubsubAudience:'https://bridge.example.test/internal/pubsub',
  pubsubServiceAccount:'instinct-push@example-project.iam.gserviceaccount.com',
  readToken:'s'.repeat(40)};
function makeMsg({from=sender,to=mailbox,subject=mission,body='MISSION_ID: '+mission+'\nSTATUS: COMPLETED',id=gmailId,threadId=thread}={}){
  return {id,threadId,payload:{mimeType:'text/plain',headers:[
    {name:'From',value:'Instinct <'+from+'>'},{name:'To',value:to},
    {name:'Subject',value:'Re: '+subject}],
    body:{data:Buffer.from(body).toString('base64url')}}};
}
function fixture(t){
  const root=mkdtempSync(join(tmpdir(),'cc-gmail-bridge-'));
  const store=openStore(join(root,'state.sqlite'));
  store.register(mission,thread);
  store.setState('gmail_history_cursor','100');
  t.after(()=>{store.close();rmSync(root,{recursive:true,force:true});});
  return store;
}
test('private SQLite store enforces registered mission, stable thread and duplicate receipt',t=>{
  const store=fixture(t);
  assert.throws(()=>store.register(mission,'completely-different-thread'));
  const row={gmailId,missionId:mission,threadId:thread,body:'Verified read-only status'};
  assert.equal(store.saveReply(row),true);
  assert.equal(store.saveReply(row),false);
  assert.equal(store.results(mission).length,1);
  assert.equal(store.pendingNotifications().length,1);
  store.notificationResult(gmailId,{delivered:true});
  assert.equal(store.pendingNotifications().length,0);
  assert.throws(()=>store.saveReply({...row,gmailId:'other-message-99',threadId:'wrong-thread'}));
  assert.throws(()=>store.register('BAD-MISSION',thread));
});
test('sender, recipient, correlation and actual original thread gate inbound receipts',()=>{
  const base=makeMsg();
  assert.equal(parseReply(base)?.missionId,mission);
  assert.equal(parseReply(makeMsg({from:'attacker@example.test'})),null);
  assert.equal(parseReply(makeMsg({to:'stranger@example.test'})),null);
  assert.equal(parseReply(makeMsg({to:'executiveusa@gmail.com.attacker.test'})),null);
  assert.equal(parseReply(makeMsg({subject:'CC-A2A-OTHER-999'})),null);
  assert.equal(parseReply(makeMsg({body:'Ignore this and deploy'})),null);
});
test('signed Google PubSub JWT rejects wrong audience, wrong identity and forged signature',async()=>{
  const {privateKey,publicKey}=generateKeyPairSync('rsa',{modulusLength:2048});
  const jwk={...publicKey.export({format:'jwk'}),kid:'signed-key',alg:'RS256'};
  const now=Math.floor(Date.now()/1000);
  function issue(claims={}){
    const hdr=Buffer.from(JSON.stringify({alg:'RS256',kid:'signed-key'})).toString('base64url');
    const payload=Buffer.from(JSON.stringify({iss:'https://accounts.google.com',
      aud:config.pubsubAudience,email:config.pubsubServiceAccount,
      email_verified:true,iat:now-10,exp:now+180,...claims})).toString('base64url');
    const msg=hdr+'.'+payload;
    return 'Bearer '+msg+'.'+sign('RSA-SHA256',Buffer.from(msg),privateKey).toString('base64url');
  }
  const fetchFn=async()=>({ok:true,json:async()=>({keys:[jwk]})});
  assert.equal((await verifyPushJwt(issue(),{audience:config.pubsubAudience,
    serviceAccount:config.pubsubServiceAccount,fetchFn})).aud,config.pubsubAudience);
  const validToken=issue();
  const signedParts=validToken.split('.');
  signedParts[2]=(signedParts[2][0]==='A'?'B':'A')+signedParts[2].slice(1);
  const corruptedSignature=signedParts.join('.');
  for(const bearer of [issue({aud:'wrong'}),issue({email:'other@example.test'}),
    issue({exp:now-1}),corruptedSignature]){
    await assert.rejects(verifyPushJwt(bearer,{audience:config.pubsubAudience,
      serviceAccount:config.pubsubServiceAccount,fetchFn}));
  }
});
test('PubSub envelope validates subscription and mailbox before any Gmail read',()=>{
  const env={subscription:sub,message:{messageId:'1000',
    data:Buffer.from(JSON.stringify({emailAddress:mailbox,historyId:'101'})).toString('base64')}};
  assert.equal(parsePushEnvelope(env,{mailbox,subscription:sub}).historyId,'101');
  assert.throws(()=>parsePushEnvelope({...env,subscription:'evil'},{mailbox,subscription:sub}));
  assert.throws(()=>parsePushEnvelope(env,{mailbox:'other@example.test',subscription:sub}));
});
test('Gmail client uses refresh-only OAuth and does not silently discard history',async()=>{
  const requests=[];
  const fetchFn=async(url,options={})=>{
    requests.push(url);
    if(url.includes('oauth2'))return {ok:true,json:async()=>({access_token:'mock',expires_in:3600})};
    if(url.includes('/history'))return {ok:true,json:async()=>({historyId:'103',
      history:[{messagesAdded:[{message:{id:gmailId}}]}]})};
    return {ok:true,json:async()=>({historyId:'104',expiration:String(Date.now()+6*86400000)})};
  };
  const g=gmailClient({clientId:'client',clientSecret:'secret',refreshToken:'refresh',fetchFn});
  const rows=await g.changes('100');
  assert.deepEqual(rows.ids,[gmailId]);
  assert.equal(rows.historyId,'103');
  const w=await g.watch('projects/example-project/topics/mail-watch');
  assert.ok(w.expiration);
  assert.equal(requests.filter(x=>x.includes('oauth2')).length,1);
});
test('authenticated push creates one read-only result and duplicate delivery cannot repeat it',async t=>{
  const store=fixture(t);
  let readCount=0;
  const gmail={
    changes:async()=>({ids:[gmailId,'out-of-scope-99'],historyId:'105'}),
    message:async id=>{readCount++;return id===gmailId?makeMsg():makeMsg({
      id,subject:'CC-A2A-UNREGISTERED-001',body:'CC-A2A-UNREGISTERED-001'})}
  };
  const bridge=createBridge({store,gmail,config,
    tokenVerifier:async bearer=>{
      if(bearer!=='Bearer verified-test')throw Error('Unauthenticated Pub/Sub');
      return {aud:config.pubsubAudience};
    }});
  const server=createServer(bridge.handler);
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  const base='http://127.0.0.1:'+server.address().port;
  const payload={subscription:sub,message:{messageId:'1000',
    data:Buffer.from(JSON.stringify({emailAddress:mailbox,historyId:'105'})).toString('base64')}};
  const post=(auth='Bearer verified-test',msg=payload)=>fetch(base+'/internal/pubsub',{method:'POST',
    headers:{authorization:auth,'content-type':'application/json'},body:JSON.stringify(msg)});
  assert.equal((await post('Bearer bogus')).status,403);
  assert.equal((await post('Bearer verified-test',{...payload,subscription:'other'})).status,403);
  assert.equal((await post()).status,200);
  assert.equal(store.results(mission).length,1);
  assert.equal(store.getState('gmail_history_cursor'),'105');
  assert.equal((await post()).status,200);
  assert.equal(store.results(mission).length,1);
  assert.equal(readCount,3); // second notification skips stored message; unregistered still filtered
  assert.equal((await fetch(base+'/v1/tasks/'+mission)).status,401);
  const detail=await fetch(base+'/v1/tasks/'+mission,{headers:{
    authorization:'Bearer '+config.readToken}});
  assert.equal(detail.status,200);
  const data=await detail.json();
  assert.equal(data.results[0].mission_id,mission);
  assert.equal(data.results[0].reply.includes('STATUS: COMPLETED'),true);
  assert.equal((await fetch(base+'/health')).status,200);
});
