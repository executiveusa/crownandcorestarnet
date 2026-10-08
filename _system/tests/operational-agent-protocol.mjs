import fs from 'node:fs';
import path from 'node:path';
import { parseAgentAnalysis } from '../runtime/model/protocol.mjs';
import { runHttpCompatible } from '../runtime/model/providers/http-compatible.mjs';
import { buildContextBundle } from '../runtime/lib/context-bundle.mjs';

const root=process.cwd();
const failures=[];

const valid=JSON.stringify({
  status:'UNKNOWN',
  summary:'Evidence is incomplete.',
  findings:[{claim:'Booking destination is publicly verified.',evidence_refs:['_shared/evidence/public-booking-path-2026-09-28.json'],confidence:'high'}],
  unknowns:['Completed booking is not verified.'],
  next_action:'Run an approved completion-path test.',
  requires_human_approval:true
});
if(!parseAgentAnalysis(valid).valid) failures.push('valid analysis rejected');
if(parseAgentAnalysis('not-json').valid) failures.push('invalid analysis accepted');

const bundle=buildContextBundle({
  repoRoot:root,
  district:'conversion',
  agentId:'path-auditor',
  promptRel:'districts/conversion/agents/path-auditor/PROMPT.md'
});
if(!bundle.files.some(x=>x.path==='districts/conversion/CONTEXT.md')) failures.push('conversion context missing from bundle');
if(bundle.files.some(x=>x.path.startsWith('districts/media/'))) failures.push('foreign media district leaked into conversion context');
if(!/^[a-f0-9]{64}$/.test(bundle.sha256)) failures.push('context bundle hash invalid');

const old={
  base:process.env.CC_MODEL_BASE_URL,
  key:process.env.CC_MODEL_API_KEY,
  model:process.env.CC_MODEL_ID
};
process.env.CC_MODEL_BASE_URL='https://model-gateway.invalid/v1';
process.env.CC_MODEL_API_KEY='test-key';
process.env.CC_MODEL_ID='test-model';

let called=false;
const fetchImpl=async (url,options)=>{
  called=true;
  const body=JSON.parse(options.body);
  if(!body.messages?.[1]?.content?.includes('OUTPUT CONTRACT')) failures.push('live provider request missing output contract');
  return {
    ok:true,
    status:200,
    async json(){
      return {choices:[{message:{content:valid}}],usage:{prompt_tokens:10,completion_tokens:10}};
    }
  };
};
const result=await runHttpCompatible({
  agent:{id:'path-auditor',district:'conversion'},
  task:'audit-booking-path',
  system:'test system prompt',
  context:bundle.text,
  fetchImpl
});
if(!called) failures.push('mock model gateway was not called');
if(result.external!==true) failures.push('http-compatible provider must identify external execution');
if(!parseAgentAnalysis(result.content).valid) failures.push('mock external response did not pass protocol');

if(old.base===undefined) delete process.env.CC_MODEL_BASE_URL; else process.env.CC_MODEL_BASE_URL=old.base;
if(old.key===undefined) delete process.env.CC_MODEL_API_KEY; else process.env.CC_MODEL_API_KEY=old.key;
if(old.model===undefined) delete process.env.CC_MODEL_ID; else process.env.CC_MODEL_ID=old.model;

if(failures.length){
  console.error('Operational agent protocol test FAILED');
  failures.forEach(x=>console.error('- '+x));
  process.exit(1);
}
console.log('Operational agent protocol test passed.');
