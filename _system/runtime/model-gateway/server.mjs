import http from 'node:http';

const port=Number(process.env.PORT||8787);
const gatewayToken=process.env.CC_GATEWAY_TOKEN;
const upstreamBase=process.env.CC_UPSTREAM_BASE_URL;
const upstreamKey=process.env.CC_UPSTREAM_API_KEY;
const upstreamModel=process.env.CC_UPSTREAM_MODEL;

if(!gatewayToken||!upstreamBase||!upstreamKey||!upstreamModel){
  console.error('Missing gateway/upstream configuration.');
  process.exit(2);
}

function json(res,status,payload){
  const body=JSON.stringify(payload);
  res.writeHead(status,{'content-type':'application/json','content-length':Buffer.byteLength(body)});
  res.end(body);
}

const server=http.createServer(async (req,res)=>{
  if(req.method==='GET'&&req.url==='/health'){
    return json(res,200,{ok:true});
  }
  if(req.method!=='POST'||req.url!=='/v1/chat/completions'){
    return json(res,404,{error:'not_found'});
  }
  const auth=req.headers.authorization||'';
  if(auth!==`Bearer ${gatewayToken}`) return json(res,401,{error:'unauthorized'});

  let raw='';
  for await(const chunk of req) raw+=chunk;
  let body;
  try{ body=JSON.parse(raw); }catch{ return json(res,400,{error:'invalid_json'}); }

  const upstreamUrl=upstreamBase.replace(/\/$/,'')+'/chat/completions';
  const upstreamBody={...body,model:upstreamModel};

  try{
    const r=await fetch(upstreamUrl,{
      method:'POST',
      headers:{
        'content-type':'application/json',
        'authorization':`Bearer ${upstreamKey}`
      },
      body:JSON.stringify(upstreamBody)
    });
    const text=await r.text();
    res.writeHead(r.status,{'content-type':r.headers.get('content-type')||'application/json'});
    res.end(text);
  }catch(e){
    json(res,502,{error:'upstream_unreachable',detail:String(e?.message||e)});
  }
});

server.listen(port,'0.0.0.0',()=>{
  console.log(`Crown & Core model gateway listening on ${port}`);
});
