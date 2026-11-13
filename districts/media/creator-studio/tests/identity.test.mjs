import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { createIdentityVerifier } from '../src/identity.mjs';
import { createStudio } from '../src/domain.mjs';
import { createApiServer } from '../src/api.mjs';

const issuer='https://identity.example.test',audience='crown-core-creator-studio';
const {privateKey,publicKey}=generateKeyPairSync('rsa',{modulusLength:2048});
const jwk={...publicKey.export({format:'jwk'}),kid:'key-one',alg:'RS256',use:'sig'};
const now=Math.floor(Date.now()/1000);
const claims=(overrides={})=>({iss:issuer,aud:audience,sub:'owner:verified-001',
  tenant_id:'crown-and-core',creator_studio_role:'owner',amr:['pwd','mfa'],
  iat:now-10,auth_time:now-20,exp:now+300,...overrides});
function jwt(body){
  const head=Buffer.from(JSON.stringify({alg:'RS256',typ:'JWT',kid:'key-one'})).toString('base64url');
  const payload=Buffer.from(JSON.stringify(body)).toString('base64url');
  const input=head+'.'+payload;
  return input+'.'+sign('RSA-SHA256',Buffer.from(input),privateKey).toString('base64url');
}
const verifier=createIdentityVerifier({issuer,audience,jwks:{keys:[jwk]}});
test('pinned RS256 JWT authenticates owner and requires MFA',()=>{
  assert.equal(verifier.verify(jwt(claims())).role,'owner');
  assert.equal(verifier.verify(jwt(claims({creator_studio_role:'clinical'}))).role,'clinical');
  for(const bad of [
    {tenant_id:'tangles-and-locs'},{amr:['pwd']},{auth_time:now-3600},{auth_time:undefined},{iss:'https://wrong.example.test'},
    {aud:'wrong-audience'},{exp:now-1},{exp:now+3600},
    {creator_studio_role:'agent'}
  ]){
    assert.throws(()=>verifier.verify(jwt(claims(bad))),e=>e.status===401);
  }
});
test('invalid signature and unsigned JWT cannot authenticate',()=>{
  const token=jwt(claims());
  assert.throws(()=>verifier.verify(token.slice(0,-4)+'AAAA'),e=>e.status===401);
  assert.throws(()=>verifier.verify('abc.def.ghi'),e=>e.status===401);
});
test('identity mode refuses static owner token while accepting MFA JWT',async t=>{
  const studio=createStudio();
  const tokens={agent:'a'.repeat(30),owner:'b'.repeat(30)};
  const server=createApiServer({studio,tokens,identity:verifier});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  const base='http://127.0.0.1:'+server.address().port;
  const created=studio.create({outcome:'Create a verified Crown & Core introduction'});
  studio.registerSource(created.id,{source_type:'facility',source_ref:'asset:one',
    rights_ref:'rights:one',usage_scope:'both'});
  studio.proposeStoryboard(created.id,{hook:'Hello',story:'A real space',cta:'Explore',
    claims_present:false,disclosure_present:false});
  const review=studio.requestReview(created.id);
  const path='/v1/outcomes/'+created.id+'/approvals';
  const post=token=>fetch(base+path,{method:'POST',headers:{
    authorization:'Bearer '+token,'content-type':'application/json'},
    body:JSON.stringify({version:review.version,decision:'approve',rights_confirmed:true})});
  assert.equal((await post(tokens.owner)).status,401);
  assert.equal((await post(jwt(claims({amr:['pwd']})))).status,401);
  assert.equal((await post(jwt(claims()))).status,200);
  assert.equal(studio.get(created.id).status,'READY_FOR_RENDER_PLAN');
  const approvalEvent=studio.get(created.id).receipts.at(-1);
  assert.equal(approvalEvent.actor_ref,'owner:verified-001');
});
