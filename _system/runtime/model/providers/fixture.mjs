export async function runFixture({agent,task,context}){
  const content=JSON.stringify({
    status:'UNKNOWN',
    summary:`Fixture proof only for ${agent.id} task ${task}.`,
    findings:[{
      claim:`Agent received ${context.length} context characters through the model seam.`,
      evidence_refs:['fixture-runtime-proof'],
      confidence:'high'
    }],
    unknowns:['No live external model reasoning was performed.'],
    next_action:'Use a configured live model provider for operational business analysis.',
    requires_human_approval:false
  });
  return {
    provider:'fixture',
    model:'deterministic-proof',
    content,
    usage:{input_tokens:0,output_tokens:0,cost_usd:0},
    external:false
  };
}
