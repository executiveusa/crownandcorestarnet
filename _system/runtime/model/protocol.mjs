export const AGENT_ANALYSIS_SCHEMA = {
  required:['status','summary','findings','unknowns','next_action','requires_human_approval'],
  statuses:['READY','BLOCKED','UNKNOWN']
};

export function agentAnalysisInstruction(){
  return [
    'Return JSON only. No markdown fences.',
    'Use exactly this shape:',
    '{',
    '  "status": "READY | BLOCKED | UNKNOWN",',
    '  "summary": "concise task result",',
    '  "findings": [{"claim":"...", "evidence_refs":["path or fact"], "confidence":"high|medium|low"}],',
    '  "unknowns": ["..."],',
    '  "next_action": "...",',
    '  "requires_human_approval": true',
    '}',
    'Never invent missing evidence. If required evidence is missing, use BLOCKED or UNKNOWN.'
  ].join('\n');
}

export function parseAgentAnalysis(content){
  if(typeof content!=='string'||!content.trim()) return {valid:false,error:'empty model content',analysis:null};
  let raw=content.trim();
  if(raw.startsWith('```')){
    raw=raw.replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');
  }
  let analysis;
  try{ analysis=JSON.parse(raw); }
  catch{ return {valid:false,error:'model content is not valid JSON',analysis:null}; }

  const missing=AGENT_ANALYSIS_SCHEMA.required.filter(k=>!(k in analysis));
  if(missing.length) return {valid:false,error:'missing keys: '+missing.join(', '),analysis};
  if(!AGENT_ANALYSIS_SCHEMA.statuses.includes(analysis.status)) return {valid:false,error:'invalid status',analysis};
  if(typeof analysis.summary!=='string') return {valid:false,error:'summary must be string',analysis};
  if(!Array.isArray(analysis.findings)) return {valid:false,error:'findings must be array',analysis};
  if(!Array.isArray(analysis.unknowns)) return {valid:false,error:'unknowns must be array',analysis};
  if(typeof analysis.next_action!=='string') return {valid:false,error:'next_action must be string',analysis};
  if(typeof analysis.requires_human_approval!=='boolean') return {valid:false,error:'requires_human_approval must be boolean',analysis};
  for(const f of analysis.findings){
    if(!f||typeof f.claim!=='string'||!Array.isArray(f.evidence_refs)||!['high','medium','low'].includes(f.confidence)){
      return {valid:false,error:'invalid finding shape',analysis};
    }
  }
  return {valid:true,error:null,analysis};
}
