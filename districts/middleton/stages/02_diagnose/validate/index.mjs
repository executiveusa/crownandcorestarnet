import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const canon=JSON.parse(fs.readFileSync(path.join(root,'districts','middleton','canon','system.json'),'utf8'));
const policy=fs.readFileSync(path.join(root,'districts','middleton','POLICY.md'),'utf8');
const citizens=fs.readFileSync(path.join(root,'districts','middleton','citizens.yaml'),'utf8');
const failures=[];
if(!Array.isArray(canon.service_sequence)||canon.service_sequence.length!==7) failures.push('canon must contain the seven-service sequence');
const last=canon.service_sequence?.at(-1);
if(!last||!String(last.service).toLowerCase().includes('paid marketing')) failures.push('paid marketing must remain the final canon service');
for(const phrase of ['Do **not** implement review gating','Crown & Core policy wins over canon','owner-approved audience','Paid media is last']){
 if(!policy.includes(phrase)) failures.push(`policy missing: ${phrase}`);
}
if(!citizens.includes('review_gating: forbidden')) failures.push('review-engine must explicitly forbid review gating');
if(!citizens.includes('gap-auditor')||!citizens.includes('status: LIVE')) failures.push('gap auditor must be registered');
if(failures.length){ console.error('Middleton district validation failed:'); failures.forEach(x=>console.error('- '+x)); process.exit(1); }
console.log('Middleton district validation passed.');
console.log(`Services: ${canon.service_sequence.length}`);
console.log('Execution policy: Crown & Core overrides canon.');
console.log('Review gating: forbidden.');
console.log('Paid media: last.');
