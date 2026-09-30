import http from 'node:http';

const port=Number(process.env.PORT||8790);

function json(res,status,payload){
  const body=JSON.stringify(payload);
  res.writeHead(status,{'content-type':'application/json','content-length':Buffer.byteLength(body)});
  res.end(body);
}

const server=http.createServer(async (req,res)=>{
  if(req.method==='GET'&&req.url==='/health') return json(res,200,{ok:true,mock:true});
  if(req.method!=='POST'||req.url!=='/v1/chat/completions') return json(res,404,{error:'not_found'});

  let raw='';
  for await(const chunk of req) raw+=chunk;
  let body={};
  try{ body=JSON.parse(raw); }catch{}
  const prompt=body?.messages?.at(-1)?.content||'';
  const task=(prompt.match(/Assigned task:\s*([^\n]+)/)||[])[1]||'unknown';

  const analysis={
    status:'UNKNOWN',
    summary:`Mock gateway exercised model path for task ${task}.`,
    findings:[{
      claim:'The isolated agent reached the model gateway and received schema-valid JSON.',
      evidence_refs:['mock-model-gateway-proof'],
      confidence:'high'
    }],
    unknowns:['This is a deterministic mock upstream, not live business reasoning.'],
    next_action:'Use the live upstream gateway command for operational verification.',
    requires_human_approval:false
  };

  json(res,200,{
    id:'mock-completion',
    object:'chat.completion',
    choices:[{index:0,message:{role:'assistant',content:JSON.stringify(analysis)},finish_reason:'stop'}],
    usage:{prompt_tokens:0,completion_tokens:0,total_tokens:0}
  });
});

server.listen(port,'0.0.0.0',()=>{
  console.log(`Mock upstream listening on ${port}`);
});
