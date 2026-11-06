import readline from "node:readline";
import { listKnowledge, searchKnowledge, getKnowledge } from "./index.mjs";

const tools = [
  { name: "crown_knowledge_list", description: "List source-attributed public-safe Crown & Core knowledge documents; not private customer records.", inputSchema: { type: "object", properties: {}, additionalProperties: false } },
  { name: "crown_knowledge_search", description: "Keyword search of allowlisted Crown & Core public repository sources with file citations and digests.", inputSchema: { type: "object", properties: { query: {type: "string", minLength: 1, maxLength: 160}, limit: {type: "integer", minimum: 1, maximum: 10} }, required: ["query"], additionalProperties: false } },
  { name: "crown_knowledge_get", description: "Read one allowlisted Crown & Core public-safe source by catalog ID (no arbitrary file paths).", inputSchema: { type: "object", properties: { id: {type: "string", minLength: 1, maxLength: 50} }, required: ["id"], additionalProperties: false } }
];

function result(message) {
  process.stdout.write(JSON.stringify(message) + "\n");
}

function handle(message) {
  const id = message.id;
  if (id === undefined) return;
  const method = message.method;
  const respond = data => result({jsonrpc: "2.0", id, result: data});
  if (method === "initialize") {
    return respond({
      protocolVersion: ["2024-11-05", "2025-03-26", "2025-06-18"].includes(message.params?.protocolVersion)
        ? message.params.protocolVersion : "2025-06-18",
      capabilities: { tools: { listChanged: false } },
      serverInfo: {name: "crown-core-knowledge", version: "1.0.0"}
    });
  }
  if (method === "ping") return respond({});
  if (method === "tools/list") return respond({tools});
  if (method === "tools/call") {
    try {
      const {name, arguments: args = {}} = message.params || {};
      let data;
      if (name === "crown_knowledge_list") data = listKnowledge();
      else if (name === "crown_knowledge_search") data = searchKnowledge(args.query, args.limit ?? 5);
      else if (name === "crown_knowledge_get") data = getKnowledge(args.id);
      else throw new Error("UNKNOWN_TOOL");
      return respond({content: [{type: "text", text: JSON.stringify(data)}], isError: false});
    } catch (error) {
      return respond({content: [{type:"text", text: String(error.message || "INVALID_REQUEST")}], isError: true});
    }
  }
  result({jsonrpc:"2.0", id, error:{code:-32601, message:"Method not found"}});
}

const rl = readline.createInterface({input:process.stdin, crlfDelay:Infinity});
rl.on("line", line => {
  try {
    if (Buffer.byteLength(line) > 65536) throw new Error("Input too large");
    const message = JSON.parse(line);
    if (!message || message.jsonrpc !== "2.0" || typeof message.method !== "string") throw new Error("Invalid JSON-RPC request");
    handle(message);
  } catch {
    result({jsonrpc:"2.0", id:null, error:{code:-32700,message:"Invalid request"}});
  }
});
