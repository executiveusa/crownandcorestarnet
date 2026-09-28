export async function runFixture({agent,task,context}){
  return {
    provider:'fixture',
    model:'deterministic-proof',
    content:`PROOF ONLY: ${agent.id} received task "${task}" with ${context.length} context characters.`,
    usage:{input_tokens:0,output_tokens:0,cost_usd:0},
    external:false
  };
}
