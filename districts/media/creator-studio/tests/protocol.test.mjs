import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { localStore } from '../src/api.mjs';
import { createStudio } from '../src/domain.mjs';
import { callTool } from '../src/mcp.mjs';

test('MCP stdio initialize and tools/list respond with valid JSON-RPC and no owner actions', async () => {
  const filename = fileURLToPath(new URL('../src/mcp.mjs', import.meta.url));
  const child = spawn(process.execPath, [filename], { stdio: ['pipe','pipe','pipe'] });
  const output = [], errors = [];
  child.stdout.on('data', chunk => output.push(chunk.toString('utf8')));
  child.stderr.on('data', chunk => errors.push(chunk.toString('utf8')));
  child.stdin.end(
    JSON.stringify({ jsonrpc:'2.0', id:1, method:'initialize', params:{} }) + '\n' +
    JSON.stringify({ jsonrpc:'2.0', id:2, method:'tools/list', params:{} }) + '\n'
  );
  const code = await new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('close', resolve);
  });
  assert.equal(code, 0, errors.join(''));
  const responses = output.join('').trim().split('\n').map(JSON.parse);
  const initialized = responses.find(r => r.id === 1);
  const listed = responses.find(r => r.id === 2);
  assert.equal(initialized.result.serverInfo.name, 'crown-core-creator-studio');
  assert.equal(initialized.result.protocolVersion, '2024-11-05');
  assert.equal(listed.result.tools.length, 7);
  assert.ok(!listed.result.tools.some(t => /approve|publish|spend|render_execute/.test(t.name)));
});
test('MCP bridge rejects non-loopback or credential-bearing endpoint URLs', async () => {
  for (const url of ['https://api.example.com','http://10.0.0.8:8787','http://user:secret@127.0.0.1:8787']) {
    await assert.rejects(
      callTool('creator_outcome_status', { id:'test-1' },
        { CREATOR_STUDIO_AGENT_TOKEN:'agent-test-token', CREATOR_STUDIO_API_URL:url }),
      /loopback HTTP only/
    );
  }
});
test('optional local proof state persists outside repo with private file mode', () => {
  const dir = mkdtempSync(join(tmpdir(), 'crown-creator-proof-'));
  try {
    const file = join(dir, 'state.json');
    const store = localStore(file);
    assert.deepEqual(store.initial, []);
    const studio = createStudio(store);
    const outcome = studio.create({ outcome:'Create a claim-free Crown & Core brand film' });
    const reloaded = localStore(file);
    assert.equal(reloaded.initial.length, 1);
    assert.equal(reloaded.initial[0].id, outcome.id);
    assert.equal(statSync(file).mode & 0o777, 0o600);
  } finally { rmSync(dir, { recursive:true, force:true }); }
});
test('local proof state refuses repository-relative persistence', () => {
  assert.throws(() => localStore('outbox/creator-state.json'), /absolute/);
  assert.throws(() => localStore(join(process.cwd(), 'outbox', 'creator-state.json')), /outside/);
});
