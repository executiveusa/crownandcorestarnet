// Agent/operator CLI for Crown & Core -> Buffer Blaster.
// Calls StarNet's own loopback API; never accepts or exposes Buffer operator keys.
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

function baseUrl(env){
  const u=new URL(env.CREATOR_STUDIO_API_URL??'http://127.0.0.1:8787');
  if(u.protocol!=='http:'||!['127.0.0.1','localhost'].includes(u.hostname)||
    u.pathname!=='/'||u.search||u.hash||u.username||u.password)
    throw new Error('Creator Studio CLI only accepts loopback API.');
  return u.origin;
}
export async function runBufferCommand(args,env=process.env,fetchFn=fetch){
  const [command,id,version,sourceUuid]=args;
  const actions={
    status:{path:'/v1/buffer/status',method:'GET',role:'agent'},
    tools:{path:'/v1/buffer/mcp-tools',method:'GET',role:'agent'},
    plan:{path:id?'/v1/outcomes/'+encodeURIComponent(id)+'/buffer-plan':null,method:'POST',role:'agent',body:{}},
    bind:{path:id?'/v1/outcomes/'+encodeURIComponent(id)+'/buffer-source-bind':null,
      method:'POST',role:'rights',body:{version:Number(version),source_uuid:sourceUuid}}
  };
  const action=actions[command];
  if(!action?.path || (command==='bind'&&(!Number.isInteger(action.body.version)||!sourceUuid)))
    throw new Error('Usage: node buffer-cli.mjs status | tools | plan <outcome-id> | bind <outcome-id> <version> <buffer-source-uuid>');
  const token=env['CREATOR_STUDIO_'+action.role.toUpperCase()+'_TOKEN'];
  if(typeof token!=='string'||!token)throw new Error('Missing '+action.role+' role credential.');
  const response=await fetchFn(baseUrl(env)+action.path,{
    method:action.method,redirect:'error',signal:AbortSignal.timeout(12000),
    headers:{authorization:'Bearer '+token,accept:'application/json',
      ...(action.body?{'content-type':'application/json'}:{})},
    ...(action.body?{body:JSON.stringify(action.body)}:{})
  });
  const raw=await response.text();
  if(raw.length>131072)throw new Error('Creator Studio response is too large.');
  let json;
  try{json=JSON.parse(raw);}catch{throw new Error('Creator Studio returned invalid JSON.');}
  if(!response.ok)throw new Error(String(json.error??'CREATOR_STUDIO_ERROR'));
  return json;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  runBufferCommand(process.argv.slice(2)).then(data=>{
    // Print only redacted status/receipt identifiers, never private media or tokens.
    const output=data.outcome?{
      outcome_id:data.outcome.id,version:data.outcome.version,
      buffer_plan_id:data.outcome.buffer_blaster?.plan?.plan_id??null,
      buffer_source_uuid:data.outcome.buffer_blaster?.source_uuid??null,
      paid_generation:false,rendered_video:false
    }:data;
    console.log(JSON.stringify(output,null,2));
  }).catch(error=>{console.error('Buffer bridge blocked:',error.message);process.exitCode=1;});
}
