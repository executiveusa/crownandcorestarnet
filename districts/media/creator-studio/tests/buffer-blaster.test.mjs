import test from 'node:test';
import assert from 'node:assert/strict';
import { createStudio } from '../src/domain.mjs';
import { createPipeline } from '../src/pipeline.mjs';
import { createBufferBlasterClient, createBufferLink } from '../src/buffer-blaster.mjs';
import { createApiServer } from '../src/api.mjs';
import { runBufferCommand } from '../src/buffer-cli.mjs';
import { tools } from '../src/mcp.mjs';

const workspace='11111111-1111-4111-8111-111111111111';
const foreign='22222222-2222-4222-8222-222222222222';
const asset='33333333-3333-4333-8333-333333333333';
const plan='44444444-4444-4444-8444-444444444444';
const at='2026-11-12T20:00:00Z';
const until='2026-12-01T20:00:00Z';
const sha='a'.repeat(64),grant='b'.repeat(64);
const errorCode=(fn,code)=>assert.rejects(fn,e=>e?.code===code);

function fixture(){
  let n=0;
  const studio=createStudio({now:()=>at,uuid:()=> 'studio-'+ ++n});
  const pipeline=createPipeline(studio,{now:()=>at});
  const id=studio.create({outcome:'Create a genuine Crown & Core 30s facility film',goal:'owned_media'}).id;
  studio.registerSource(id,{source_type:'facility',source_ref:'asset:real',
    rights_ref:'rights:actual',usage_scope:'both'});
  studio.proposeStoryboard(id,{hook:'Welcome to Crown & Core',
    story:'Show only actual authorized facility footage and staff',
    cta:'Explore verified services',claims_present:false,disclosure_present:false});
  const requested=studio.requestReview(id);
  studio.decide(id,'owner',{version:requested.version,decision:'approve',rights_confirmed:true});
  studio.decide(id,'clinical',{version:requested.version,decision:'approve',claim_ref:'clinical:screened'});
  studio.prepareRenderPlan(id,{provider:'montage',idempotency_key:'render:one',max_cost_usd:5});
  pipeline.verifyRights(id,'rights',{version:requested.version,rights_ref:'rights:actual',
    grant_ref:'grant:actual',grant_sha256:grant,asset_sha256:sha,
    scope:'both',revoked:false,expires_at:until});
  return {studio,id,version:requested.version,pipeline};
}
function fakeBuffer({workspaceId=workspace,paid=false,backend='supabase',kind='uploaded_reference'}={}){
  const calls=[];
  let persisted;
  const json=(value)=>({ok:true,status:200,headers:{get:()=>null},text:async()=>JSON.stringify(value)});
  const client=createBufferBlasterClient({
    baseUrl:'https://blaster.example.test/',token:'server-only-operator-key'.repeat(2),
    workspaceId:workspace,fetchFn:async(url,options)=>{
      const path=new URL(url).pathname;
      calls.push({path,method:options.method,headers:options.headers,body:options.body});
      if(path==='/api/health')return json({status:'ok',version:'2.0.0',
        platform:'buffer blaster',approval_gate:true,media_configured:false,
        storage_configured:false,ledger:{backend:'supabase'}});
      if(path==='/api/studio/status')return json({ok:true,approval_gate:true,ledger:{backend}});
      if(path==='/api/mcp')return json({jsonrpc:'2.0',id:1,result:{tools:[
        {name:'studio_status'},{name:'create_ugc_plan'},{name:'get_ugc_plan'}]}});
      if(path==='/api/studio/references/'+asset)return json({ok:true,workspace_id:workspaceId,
        asset:{id:asset,workspace_id:workspaceId,kind},rights_verified:false,paid_generation:false});
      if(path==='/api/studio/ugc/plans'&&options.method==='POST'){
        const input=JSON.parse(options.body);
        persisted={...input,plan_id:plan,workspace_id:workspaceId};
        return json({ok:true,plan:persisted,backend,created:true,
          idempotent_replay:false,paid_generation:paid});
      }
      if(path==='/api/studio/ugc/plans/'+plan)return json({ok:true,plan:persisted,
        backend,paid_generation:false});
      throw new Error('unexpected Buffer request '+path);
    }
  });
  return {client,calls,read:()=>persisted};
}
test('authenticated Buffer status and MCP catalog are read-only and truthful',async()=>{
  const b=fakeBuffer();
  const status=await b.client.status();
  assert.equal(status.connected,true);
  assert.equal(status.crown_30_15_render_supported,false);
  assert.equal(status.media_configured,false);
  assert.equal((await b.client.tools()).tools.includes('create_ugc_plan'),true);
  assert.equal(b.calls.length,3);
  assert.ok(b.calls.every(c=>!String(c.body??'').includes('approved":true')));
  assert.ok(b.calls.every(c=>c.headers.authorization.startsWith('Bearer ')));
});
test('source binding and canonical 30s draft plan use actual Buffer APIs, zero spend and exact readback',async()=>{
  const f=fixture(),b=fakeBuffer();
  const link=createBufferLink(f.studio,b.client);
  await link.bindSource(f.id,{version:f.version,source_uuid:asset},'rights');
  const result=await link.syncPlan(f.id);
  assert.equal(result.external.readback_verified,true);
  assert.equal(result.outcome.buffer_blaster.plan.plan_id,plan);
  assert.equal(f.studio.summary(f.id).verified_video,false);
  const payload=b.read();
  assert.equal(payload.aspect_ratio,'9:16');
  assert.equal(payload.duration_seconds,30);
  assert.equal(payload.approval_state,'draft');
  assert.equal(payload.estimated_cost_ceiling_cents,0);
  assert.equal(payload.finish_mode,'editorial_brand');
  assert.deepEqual(payload.metadata.requested_cuts_seconds,[30,15]);
  assert.deepEqual(payload.product_source_refs,[asset]);
  assert.match(payload.script,/actual authorized facility footage/);
  assert.equal(payload.metadata.clinical_screening_verified,true);
  assert.equal(b.calls.filter(x=>x.path==='/api/studio/ugc/plans'&&x.method==='POST').length,1);
  const replay=await link.syncPlan(f.id);
  assert.equal(replay.external.created,false);
  assert.equal(b.calls.filter(x=>x.path==='/api/studio/ugc/plans'&&x.method==='POST').length,1);
});
test('wrong Buffer workspace or unsafe URL source is refused before plan persistence',async()=>{
  const f=fixture(),foreignBuffer=fakeBuffer({workspaceId:foreign});
  await errorCode(()=>createBufferLink(f.studio,foreignBuffer.client).bindSource(
    f.id,{version:f.version,source_uuid:asset},'rights'),'BUFFER_REFERENCE_DENIED');
  const unsafe=fakeBuffer({kind:'url'});
  await errorCode(()=>createBufferLink(f.studio,unsafe.client).bindSource(
    f.id,{version:f.version,source_uuid:asset},'rights'),'BUFFER_UNSAFE_SOURCE');
});
test('mismatched paid/canonical response and stale creative revision fail closed',async()=>{
  for(const config of [{paid:true},{backend:'redis'}]){
    const f=fixture(),b=fakeBuffer(config),link=createBufferLink(f.studio,b.client);
    await link.bindSource(f.id,{version:f.version,source_uuid:asset},'rights');
    await errorCode(()=>link.syncPlan(f.id),
      config.paid?'BUFFER_CONTRACT_DRIFT':'NONCANONICAL_BUFFER_BACKEND');
    assert.equal(f.studio.get(f.id).buffer_blaster.plan,null);
  }
  const f=fixture(),b=fakeBuffer(),link=createBufferLink(f.studio,b.client);
  await link.bindSource(f.id,{version:f.version,source_uuid:asset},'rights');
  f.studio.proposeStoryboard(f.id,{hook:'New film',story:'Only verified footage',
    cta:'Explore',claims_present:false,disclosure_present:false});
  await errorCode(()=>link.syncPlan(f.id),'NOT_READY');
  assert.equal(f.studio.get(f.id).buffer_blaster,null);
});
test('agent cannot bind media source, choose provider payload or access Buffer operator credentials',async t=>{
  const f=fixture(),b=fakeBuffer();
  const tokens={agent:'agent-test-token-long-enough',owner:'owner-test-token-long-enough',
    rights:'rights-test-token-long-enough'};
  const server=createApiServer({studio:f.studio,tokens,bufferClient:b.client});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  const base='http://127.0.0.1:'+server.address().port;
  const request=(path,role,method='GET',body)=>fetch(base+path,{
    method,headers:{...(role?{authorization:'Bearer '+tokens[role]}:{}),
      ...(body?{'content-type':'application/json'}:{})},
    ...(body?{body:JSON.stringify(body)}:{})
  });
  assert.equal((await request('/v1/buffer/status',null)).status,401);
  const status=await request('/v1/buffer/status','agent');
  assert.equal(status.status,200);
  const body=await status.json();
  assert.equal(body.buffer.crown_30_15_render_supported,false);
  assert.equal(JSON.stringify(body).includes('server-only-operator-key'),false);
  const url='/v1/outcomes/'+f.id;
  assert.equal((await request(url+'/buffer-source-bind','agent','POST',{
    version:f.version,source_uuid:asset})).status,403);
  assert.equal((await request(url+'/buffer-source-bind','rights','POST',{
    version:f.version,source_uuid:asset})).status,200);
  assert.equal((await request(url+'/buffer-plan','agent','POST',{
    wallet_id:'forbidden-wallet',approved:true})).status,400);
  const planned=await request(url+'/buffer-plan','agent','POST',{});
  assert.equal(planned.status,200);
  assert.equal((await planned.json()).external.readback_verified,true);
  assert.equal(b.calls.filter(x=>x.path.includes('/factory/execute')).length,0);
});
test('CLI routes to StarNet loopback API, not directly to Buffer operator API',async()=>{
  let seen;
  const fake=async(url,options)=>{
    seen={url,options};
    return {ok:true,status:200,text:async()=>JSON.stringify({buffer:{connected:true}})};
  };
  const result=await runBufferCommand(['status'],{
    CREATOR_STUDIO_API_URL:'http://127.0.0.1:8787',
    CREATOR_STUDIO_AGENT_TOKEN:'agent-opaque-token'
  },fake);
  assert.equal(result.buffer.connected,true);
  assert.equal(seen.url,'http://127.0.0.1:8787/v1/buffer/status');
  assert.equal(seen.options.headers.authorization,'Bearer agent-opaque-token');
  assert.ok(!seen.options.headers['x-api-key']);
  await assert.rejects(runBufferCommand(['status'],{
    CREATOR_STUDIO_API_URL:'https://external.example.test',
    CREATOR_STUDIO_AGENT_TOKEN:'secret'
  },fake),/loopback/);
});
test('MCP exports only safe Buffer operations, not arbitrary tools or paid execution',()=>{
  assert.equal(tools.length,11);
  assert.ok(tools.some(t=>t.name==='creator_buffer_status'));
  assert.ok(tools.some(t=>t.name==='creator_buffer_plan_sync'));
  assert.ok(!tools.some(t=>/execute_ugc|spend|approve|publish|send/i.test(t.name)));
});
