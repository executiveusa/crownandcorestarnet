import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { resolveInside } from './lib/jail.mjs';

const required = ['CC_AGENT_ID','CC_COMPUTER_ID','CC_DISTRICT','CC_RUN_ID','CC_COMPUTER_ROOT'];
for (const key of required) {
  if (!process.env[key]) {
    console.error(JSON.stringify({status:'FAILED',error:`missing ${key}`}));
    process.exit(2);
  }
}

const agentId = process.env.CC_AGENT_ID;
const computerId = process.env.CC_COMPUTER_ID;
const district = process.env.CC_DISTRICT;
const runId = process.env.CC_RUN_ID;
const computerRoot = path.resolve(process.env.CC_COMPUTER_ROOT);
const workspace = path.join(computerRoot,'workspace');
const receiptsDir = path.join(computerRoot,'receipts');

fs.mkdirSync(workspace,{recursive:true});
fs.mkdirSync(receiptsDir,{recursive:true});

const startedAt = new Date().toISOString();
const evidence = [];
let status='COMPLETED';
let error=null;

try {
  let traversalBlocked=false;
  try { resolveInside(workspace,'../escape.txt'); } catch { traversalBlocked=true; }
  if (!traversalBlocked) throw new Error('workspace traversal guard failed');
  evidence.push({type:'isolation_probe',passed:true});

  const artifactPath = resolveInside(workspace,`health/${runId}.json`);
  fs.mkdirSync(path.dirname(artifactPath),{recursive:true});
  const artifact = {
    run_id:runId,
    agent_id:agentId,
    computer_id:computerId,
    district,
    pid:process.pid,
    cwd:process.cwd(),
    home:process.env.HOME || process.env.USERPROFILE || null,
    tmp:process.env.TMPDIR || process.env.TMP || null,
    task:'healthcheck'
  };
  fs.writeFileSync(artifactPath,JSON.stringify(artifact,null,2)+'\n');
  const bytes=fs.readFileSync(artifactPath);
  const sha256=crypto.createHash('sha256').update(bytes).digest('hex');
  evidence.push({type:'artifact',path:path.relative(computerRoot,artifactPath),sha256,bytes:bytes.length});
} catch (e) {
  status='FAILED';
  error=String(e?.message || e);
}

const receipt={
  schema:'cc.run.receipt.v1',
  run_id:runId,
  agent_id:agentId,
  computer_id:computerId,
  district,
  pid:process.pid,
  started_at:startedAt,
  ended_at:new Date().toISOString(),
  task_type:'healthcheck',
  status,
  workspace:path.relative(process.cwd(),workspace) || '.',
  evidence,
  error
};

const receiptPath=resolveInside(receiptsDir,`${runId}.json`);
fs.writeFileSync(receiptPath,JSON.stringify(receipt,null,2)+'\n');
process.stdout.write(JSON.stringify(receipt)+'\n');
process.exit(status==='COMPLETED'?0:1);
