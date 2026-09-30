export async function runHttpCompatible({agent,task,system,context}){
  const base=process.env.CC_MODEL_BASE_URL;
  const key=process.env.CC_MODEL_API_KEY;
  const model=process.env.CC_MODEL_ID;
  if(!base||!key||!model) throw new Error('HTTP-compatible model provider is missing CC_MODEL_BASE_URL, CC_MODEL_API_KEY, or CC_MODEL_ID');

  const url=base.replace(/\/$/,'')+'/chat/completions';
  const response=await fetch(url,{
    method:'POST',
    headers:{'content-type':'application/json','authorization':`Bearer ${key}`},
    body:JSON.stringify({
      model,
      messages:[
        {role:'system',content:system},
        {role:'user',content:`Assigned task: ${task}\n\nVerified context:\n${context}`}
      ],
      temperature:0.2
    })
  });
  if(!response.ok) throw new Error(`model gateway HTTP ${response.status}`);
  const data=await response.json();
  const content=data?.choices?.[0]?.message?.content;
  if(typeof content!=='string'||!content.trim()) throw new Error('model gateway returned no assistant content');
  return {
    provider:'http-compatible',
    model,
    content,
    usage:data.usage||null,
    external:true
  };
}
