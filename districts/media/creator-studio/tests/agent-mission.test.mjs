import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { tools } from '../src/mcp.mjs';

const manifest=JSON.parse(readFileSync(new URL('../agent-workflow.json',import.meta.url),'utf8'));
const tasks=new Map(manifest.tasks.map(task=>[task.id,task]));
function ancestors(id,visited=new Set()){
  const task=tasks.get(id);
  assert.ok(task,'Unknown task: '+id);
  for(const dependency of task.depends_on??[]){
    assert.ok(!visited.has(dependency),'Cycle in mission graph at '+dependency);
    visited.add(dependency);
    ancestors(dependency,visited);
  }
  return visited;
}

test('agent mission uses exactly the actual MCP tool catalog, without paid or approval tools',()=>{
  const manifestTools=new Set(manifest.tools.agent);
  assert.equal(manifestTools.size,tools.length);
  assert.deepEqual([...manifestTools].sort(),tools.map(t=>t.name).sort());
  assert.ok(![...manifestTools].some(name=>/approve|execute_ugc|publish|wallet|spend|send/i.test(name)));
});
test('real render plan and verified rights precede Buffer source binding and no-spend sync',()=>{
  const order=[
    'intent','brand-truth','creative','review','rights-and-approval',
    'starnet-render-plan','rights-verify','buffer-source-bind','buffer-plan-sync','render'
  ];
  for(let i=0;i<order.length;i++){
    const task=tasks.get(order[i]);
    assert.ok(task,order[i]+' missing');
    const before=ancestors(order[i]);
    for(let previous=0;previous<i;previous++)
      assert.ok(before.has(order[previous]),order[i]+' must depend on '+order[previous]);
  }
  assert.deepEqual(tasks.get('starnet-render-plan').tools,['creator_render_plan_prepare']);
  assert.deepEqual(tasks.get('buffer-plan-sync').tools,['creator_buffer_plan_sync']);
});
test('all task dependencies exist and do not form cycles',()=>{
  const ids=new Set(tasks.keys());
  assert.equal(ids.size,manifest.tasks.length);
  for(const task of manifest.tasks){
    for(const dep of task.depends_on??[])
      assert.ok(ids.has(dep),'unknown dependency '+dep+' in '+task.id);
    assert.ok(!ancestors(task.id).has(task.id),'cyclic task '+task.id);
  }
});
test('Crown/Buffer authority and costs remain separate',()=>{
  assert.equal(manifest.tenant_id,'crown-and-core');
  assert.equal(manifest.defaults.paid_media_enabled,false);
  assert.equal(manifest.integration.status,'code-only-mocked-no-live-endpoint');
  assert.equal(manifest.integration.canonical_plan_backend,'supabase');
  assert.equal(manifest.integration.expected_media.rights_verified,true);
  assert.equal(manifest.integration.expected_media.clinical_screening,true);
});
