import test from "node:test";
import assert from "node:assert/strict";
import {checkConfig,preflight} from "../knowledge/paperclip-preflight.mjs";
const env={PAPERCLIP_API_URL:"https://pc.example.org",PAPERCLIP_API_KEY:"synthetic-only-key",PAPERCLIP_COMPANY_ID:"company-1",PAPERCLIP_INSTINCT_AGENT_ID:"agent-1",PAPERCLIP_PROJECT_ID:"project-1"};
const agent={id:"agent-1",companyId:"company-1",status:"idle",name:"Alex"};
const project={id:"project-1",companyId:"company-1",name:"Crown & Core"};
const workspace={repoUrl:"https://github.com/executiveusa/crownandcorestarnet.git",repoRef:"feat/paperclip-instinct-knowledge-hub"};
function mock(patches={}){
 const routes={
  "/api/agents/agent-1":agent,
  "/api/companies/company-1/projects":[project],
  "/api/projects/project-1/workspaces":[workspace],...patches
 };
 const requests=[];
 const fetcher=async(u,options)=>{
  requests.push({u,options});
  const found=routes[new URL(u).pathname];
  return found===undefined?{ok:false,status:404}:{ok:true,status:200,text:async()=>JSON.stringify(found)};
 };
 return {requests,fetcher};
}
test("fails closed with missing identity without request",async()=>{
 let calls=0;
 const result=await preflight({},()=>{calls++;throw Error("wrong")});
 assert.equal(result.reason,"MISSING_CONFIG");assert.equal(calls,0);
});
test("forbids non-TLS remote URL and embedded credentials",()=>{
 assert.equal(checkConfig({...env,PAPERCLIP_API_URL:"http://external.com"}).reason,"HTTPS_REQUIRED");
 assert.equal(checkConfig({...env,PAPERCLIP_API_URL:"https://a:b@external.com"}).reason,"INVALID_PAPERCLIP_URL");
});
test("verified existing company/agent/project/workspace uses GET-only",async()=>{
 const m=mock();const result=await preflight(env,m.fetcher);
 assert.equal(result.status,"READY_FOR_RUNTIME_WALK_TEST");
 assert.equal(result.external_writes,0);assert.equal(result.model_run_verified,false);
 assert.equal(m.requests.length,3);
 assert.ok(m.requests.every(x=>x.options.method==="GET"));
});
test("blocks wrong agent company",async()=>{
 assert.equal((await preflight(env,mock({"/api/agents/agent-1":{...agent,companyId:"other"}}).fetcher)).reason,"AGENT_COMPANY_MISMATCH");
});
test("blocks nonexistent project without creating one",async()=>{
 const m=mock({"/api/companies/company-1/projects":[]});
 assert.equal((await preflight(env,m.fetcher)).reason,"PROJECT_NOT_FOUND");
 assert.ok(m.requests.every(x=>x.options.method==="GET"));
});
test("must bind canonical repo and feature ref, not main",async()=>{
 assert.equal((await preflight(env,mock({"/api/projects/project-1/workspaces":[{repoUrl:"https://example.org/not-our-repo",repoRef:"main"}]}).fetcher)).reason,"REPOSITORY_NOT_BOUND");
 assert.equal((await preflight(env,mock({"/api/projects/project-1/workspaces":[{...workspace,repoRef:"main"}]}).fetcher)).reason,"FEATURE_REF_NOT_BOUND");
});
test("never outputs provider body or API key on failed authentication",async()=>{
 const result=await preflight(env,async()=>({ok:false,status:401,text:async()=>env.PAPERCLIP_API_KEY}));
 assert.equal(result.reason,"UNAUTHORIZED");
 assert.equal(JSON.stringify(result).includes(env.PAPERCLIP_API_KEY),false);
});
