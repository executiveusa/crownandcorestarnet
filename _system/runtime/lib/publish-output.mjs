import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

function inside(root,target){
  const r=path.resolve(root), t=path.resolve(target);
  return t===r||t.startsWith(r+path.sep);
}

function safeText(v){
  return String(v??'').replace(/\r/g,'').trim();
}

export function publishOperationalOutput({repoRoot,agent,receipt}){
  if(receipt.business_output_verified!==true || receipt.verification_tier!=='operational'){
    return {published:false,reason:'not_operational'};
  }
  if(!agent.output_path) throw new Error('agent missing output_path');

  const expectedPrefix=`districts/${agent.district}/output/`;
  if(!agent.output_path.startsWith(expectedPrefix)) throw new Error('agent output_path escapes owning district output');

  const art=(receipt.evidence||[]).find(x=>x.type==='artifact');
  if(!art) throw new Error('operational receipt missing artifact evidence');

  const computerRoot=path.join(repoRoot,'.runtime','computers',receipt.computer_id);
  const artifactPath=path.resolve(computerRoot,art.path);
  if(!inside(computerRoot,artifactPath)||!fs.existsSync(artifactPath)) throw new Error('operational artifact missing or escaped');

  const artifactRaw=fs.readFileSync(artifactPath);
  const artifactSha=crypto.createHash('sha256').update(artifactRaw).digest('hex');
  if(artifactSha!==art.sha256) throw new Error('operational artifact hash mismatch');

  const artifact=JSON.parse(artifactRaw.toString('utf8'));
  if(artifact.verification_tier!=='operational'||!artifact.model_analysis) throw new Error('artifact lacks operational model analysis');

  const analysis=artifact.model_analysis;
  const context=(receipt.evidence||[]).find(x=>x.type==='context_bundle');
  const model=(receipt.evidence||[]).find(x=>x.type==='model_run');

  const lines=[
    '---',
    `run_id: ${receipt.run_id}`,
    `agent_id: ${receipt.agent_id}`,
    `district: ${receipt.district}`,
    'verification_tier: operational',
    'business_output_verified: true',
    `source_artifact_sha256: ${artifactSha}`,
    `context_sha256: ${context?.sha256||'unknown'}`,
    `model_response_sha256: ${model?.response_sha256||'unknown'}`,
    `generated_at: ${receipt.ended_at}`,
    '---',
    '',
    `# ${safeText(analysis.summary)||agent.id}`,
    '',
    `**Status:** ${safeText(analysis.status)}`,
    '',
    '## Findings',
    '',
    ...(Array.isArray(analysis.findings)&&analysis.findings.length
      ? analysis.findings.flatMap(f=>[
          `- **${safeText(f.claim)}**`,
          `  - Confidence: ${safeText(f.confidence)}`,
          `  - Evidence: ${(f.evidence_refs||[]).map(safeText).join('; ')||'none supplied'}`
        ])
      : ['- None']),
    '',
    '## Unknowns',
    '',
    ...(Array.isArray(analysis.unknowns)&&analysis.unknowns.length
      ? analysis.unknowns.map(x=>`- ${safeText(x)}`)
      : ['- None']),
    '',
    '## Next action',
    '',
    safeText(analysis.next_action)||'No next action supplied.',
    '',
    '## Human gate',
    '',
    analysis.requires_human_approval===true
      ? 'Required before any gated execution.'
      : 'No additional human approval requested by this analysis. Existing Crown & Core policy gates still apply.',
    '',
    '> This file is an ICM edit surface produced from a verified runtime artifact. Human edits are allowed and do not rewrite the source machine receipt.'
  ];

  const out=path.resolve(repoRoot,agent.output_path);
  if(!inside(repoRoot,out)) throw new Error('output path escapes repo');
  fs.mkdirSync(path.dirname(out),{recursive:true});
  const text=lines.join('\n')+'\n';
  fs.writeFileSync(out,text);
  const outputSha=crypto.createHash('sha256').update(text).digest('hex');
  return {
    published:true,
    path:agent.output_path,
    sha256:outputSha,
    source_artifact_sha256:artifactSha
  };
}
