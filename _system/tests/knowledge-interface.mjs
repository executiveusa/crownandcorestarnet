import test from "node:test";
import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {listKnowledge,searchKnowledge,getKnowledge} from "../knowledge/index.mjs";

test("catalog is a real allowlist with inspected local sources", () => {
  const manifest = listKnowledge();
  assert.equal(manifest.classification, "public_repo_only");
  assert.equal(manifest.connected_private_database, false);
  assert.ok(manifest.source_count >= 20);
  assert.ok(manifest.sources.every(x => !x.source_path.includes("..")));
});
test("public booking knowledge has provenance without claiming completed appointments", () => {
  const source = getKnowledge("public-truth");
  assert.match(source.content, /Square service catalog/);
  assert.match(source.content, /not.*tested/i);
  assert.match(source.sha256, /^[a-f0-9]{64}$/);
});
test("keyword search returns citeable results", () => {
  const result = searchKnowledge("Square booking", 8);
  assert.ok(result.results.some(x => x.id === "public-truth" || x.id === "booking-evidence"));
  assert.ok(result.results.every(x => x.source_path && x.sha256.length === 64 && x.source_line >= 1));
});
test("unknown IDs, traversal and unbounded searches fail closed", () => {
  assert.throws(() => getKnowledge("../../.env"), /UNKNOWN_SOURCE/);
  assert.throws(() => getKnowledge("private-contract"), /UNKNOWN_SOURCE/);
  assert.throws(() => searchKnowledge("x".repeat(200)), /Search query/);
  assert.throws(() => searchKnowledge("booking", 900), /Limit/);
});
test("MCP stdio can initialize, list tools, and execute an actual read", () => {
  const script = fileURLToPath(new URL("../knowledge/mcp-stdio.mjs", import.meta.url));
  const requests = [
    {jsonrpc:"2.0",id:1,method:"initialize",params:{protocolVersion:"2025-06-18"}},
    {jsonrpc:"2.0",id:2,method:"tools/list"},
    {jsonrpc:"2.0",id:3,method:"tools/call",params:{name:"crown_knowledge_get",arguments:{id:"public-truth"}}},
    {jsonrpc:"2.0",id:4,method:"tools/call",params:{name:"crown_knowledge_get",arguments:{id:"../../.env"}}}
  ];
  const output = execFileSync(process.execPath, [script], {input:requests.map(x => JSON.stringify(x)).join("\n") + "\n",encoding:"utf8",timeout:8000});
  const lines = output.trim().split("\n").map(x=>JSON.parse(x));
  assert.equal(lines.length, 4);
  assert.equal(lines[0].result.serverInfo.name, "crown-core-knowledge");
  assert.equal(lines[1].result.tools.length, 3);
  assert.equal(lines[2].result.isError, false);
  assert.match(lines[2].result.content[0].text, /public-truth/);
  assert.equal(lines[3].result.isError, true);
});
