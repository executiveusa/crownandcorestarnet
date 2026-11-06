// Read-only validation: existing Paperclip company, Instinct agent, and Crown & Core workspace.
const required=["PAPERCLIP_API_URL","PAPERCLIP_API_KEY","PAPERCLIP_COMPANY_ID","PAPERCLIP_INSTINCT_AGENT_ID"];
const canonical="https://github.com/executiveusa/crownandcorestarnet";
const featureRef="feat/paperclip-instinct-knowledge-hub";
const block=(reason,extra={})=>({status:"BLOCKED",reason,external_writes:0,model_run_verified:false,private_database_connected:false,...extra});
const ident=x=>typeof x==="string"&&/^[A-Za-z0-9_.-]{2,150}$/.test(x);
export function checkConfig(env){
 const missing=required.filter(x=>!env[x]);
 if(missing.length)return block("MISSING_CONFIG",{missing});
 if(!ident(env.PAPERCLIP_COMPANY_ID)||!ident(env.PAPERCLIP_INSTINCT_AGENT_ID)||
    (env.PAPERCLIP_PROJECT_ID&&!ident(env.PAPERCLIP_PROJECT_ID)))return block("INVALID_ID");
 if(typeof env.PAPERCLIP_API_KEY!=="string"||env.PAPERCLIP_API_KEY.length<12||/[\r\n]/.test(env.PAPERCLIP_API_KEY))return block("INVALID_KEY_FORMAT");
 try{
  const u=new URL(env.PAPERCLIP_API_URL);
  const loopback=["localhost","127.0.0.1","[::1]"].includes(u.hostname.toLowerCase());
  if(u.username||u.password||u.search||u.hash||u.pathname!=="/")return block("INVALID_PAPERCLIP_URL");
  if(u.protocol!=="https:"&&!(u.protocol==="http:"&&loopback))return block("HTTPS_REQUIRED");
  return {status:"CONFIG_VALID",baseUrl:u.origin};
 }catch{return block("INVALID_PAPERCLIP_URL");}
}
const unpack=(value,key)=>Array.isArray(value)?value:(Array.isArray(value?.[key])?value[key]:null);
const normalizedRepo=x=>typeof x==="string"?x.replace(/\/$/,"").replace(/\.git$/i,"").toLowerCase():"";
export async function preflight(env,fetcher=globalThis.fetch){
 const config=checkConfig(env);
 if(config.status!=="CONFIG_VALID")return config;
 const get=async path=>{
  const c=new AbortController(),timer=setTimeout(()=>c.abort(),6000);
  try{
   const resp=await fetcher(config.baseUrl+path,{
     method:"GET",redirect:"error",signal:c.signal,
     headers:{authorization:"Bearer "+env.PAPERCLIP_API_KEY,accept:"application/json"}});
   if(!resp.ok)throw Error([401,403].includes(resp.status)?"UNAUTHORIZED":"REMOTE_HTTP_ERROR");
   const value=await resp.text();
   if(value.length>150000)throw Error("OVERSIZED_RESPONSE");
   return JSON.parse(value);
  }finally{clearTimeout(timer);}
 };
 try{
  const agent=await get("/api/agents/"+encodeURIComponent(env.PAPERCLIP_INSTINCT_AGENT_ID));
  if(agent.id!==env.PAPERCLIP_INSTINCT_AGENT_ID||agent.companyId!==env.PAPERCLIP_COMPANY_ID)return block("AGENT_COMPANY_MISMATCH");
  if(["terminated","error"].includes(agent.status))return block("AGENT_UNAVAILABLE");
  const projects=unpack(await get("/api/companies/"+encodeURIComponent(env.PAPERCLIP_COMPANY_ID)+"/projects"),"projects");
  if(!projects)return block("INVALID_PROJECT_RESPONSE");
  const match=env.PAPERCLIP_PROJECT_ID
   ? projects.filter(x=>x.id===env.PAPERCLIP_PROJECT_ID)
   : projects.filter(x=>/crown[\s&+-]*core/i.test(x.name||""));
  if(match.length!==1)return block(match.length?"AMBIGUOUS_PROJECT":"PROJECT_NOT_FOUND");
  const project=match[0];
  if(project.companyId&&project.companyId!==env.PAPERCLIP_COMPANY_ID)return block("PROJECT_COMPANY_MISMATCH");
  const workspaces=unpack(await get("/api/projects/"+encodeURIComponent(project.id)+"/workspaces"),"workspaces");
  if(!workspaces)return block("INVALID_WORKSPACE_RESPONSE");
  const ours=workspaces.filter(w=>normalizedRepo(w.repoUrl)===canonical);
  if(!ours.length)return block("REPOSITORY_NOT_BOUND",{project_id:project.id});
  if(!ours.some(w=>w.repoRef===featureRef))return block("FEATURE_REF_NOT_BOUND",{project_id:project.id,required_ref:featureRef});
  return {status:"READY_FOR_RUNTIME_WALK_TEST",company_id:env.PAPERCLIP_COMPANY_ID,agent_id:agent.id,
          project_id:project.id,repo_url:canonical,repo_ref:featureRef,
          model_run_verified:false,private_database_connected:false,external_writes:0};
 }catch(e){return block(e.message==="UNAUTHORIZED"?"UNAUTHORIZED":"PAPERCLIP_UNREACHABLE_OR_INVALID_RESPONSE");}
}
if(process.argv[1]&&import.meta.url===new URL("file://"+process.argv[1]).href){
 preflight(process.env).then(r=>{
  process.stdout.write(JSON.stringify(r,null,2)+"\n");
  if(r.status!=="READY_FOR_RUNTIME_WALK_TEST")process.exitCode=2;
 });
}
