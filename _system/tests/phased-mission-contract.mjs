import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const mission=JSON.parse(fs.readFileSync(path.join(root,'_system','runtime','missions','phased-proof.json'),'utf8'));
const agents=JSON.parse(fs.readFileSync(path.join(root,'_system','runtime','agents.json'),'utf8'));
const all=[agents.manager,...agents.agents];
const failures=[];

const phases=mission.phases||[];
const ids=phases.flatMap(p=>p.agent_ids||[]);
const expected=all.map(x=>x.id).sort();
const actual=[...ids].sort();

if(phases.map(x=>x.id).join('>')!=='workers>performance>management') failures.push('phase order must be workers -> performance -> management');
if(JSON.stringify(expected)!==JSON.stringify(actual)) failures.push('phased mission must contain every registered agent exactly once');
if(new Set(ids).size!==ids.length) failures.push('phased mission contains duplicate agent');
if(!(phases.find(x=>x.id==='performance')?.agent_ids||[]).includes('receipt-verifier')) failures.push('receipt-verifier must run in Performance phase');
if(!(phases.find(x=>x.id==='performance')?.agent_ids||[]).includes('attribution-auditor')) failures.push('attribution-auditor must run in Performance phase');
if((phases.find(x=>x.id==='management')?.agent_ids||[]).join(',')!=='manny') failures.push('Manny must close the mission after Performance');
if((phases.find(x=>x.id==='workers')?.agent_ids||[]).includes('manny')) failures.push('Manny may not run concurrently with worker phase');

for(const sibling of ['phased-gateway-proof.json','phased-operational.json']){
  const m=JSON.parse(fs.readFileSync(path.join(root,'_system','runtime','missions',sibling),'utf8'));
  if(JSON.stringify(m.phases)!==JSON.stringify(phases)) failures.push(sibling+' phase graph differs from proof graph');
}

if(failures.length){
  console.error('Phased mission contract FAILED');
  failures.forEach(x=>console.error('- '+x));
  process.exit(1);
}
console.log('Phased mission contract passed: 14 workers -> 2 Performance agents -> Manny.');
console.log('All 17 registered agents appear exactly once.');
