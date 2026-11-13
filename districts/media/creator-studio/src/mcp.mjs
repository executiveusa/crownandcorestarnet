// MCP stdio bridge for the local Creator Studio API. Agent-scoped tools only.
// Instinct must use its own verified runtime and agent token; no approval tool is exposed.
import { createInterface } from 'node:readline';

const field = (type, description, more = {}) => ({ type, description, ...more });
const object = (properties, required = []) => ({ type: 'object', properties, required, additionalProperties: false });
const id = field('string', 'Opaque Crown & Core outcome ID');
export const tools = [
  { name: 'creator_outcome_create', description: 'Create a draft from an owner-stated outcome. Does not render or publish.',
    inputSchema: object({ outcome: field('string', 'Desired business outcome, no customer identifiers'),
      goal: field('string', 'Goal', { enum: ['qualified_inquiries','booking_intent','owned_media'] }),
      placement: field('string', 'Creative placement', { enum: ['instagram_reel','facebook_reel','youtube_short','organic_video'] }),
      creative_direction: field('string', 'Optional creative direction'), service_ref: field('string', 'Optional verified service ID') }, ['outcome']) },
  { name: 'creator_outcome_status', description: 'Read a concise, receipt-backed status. Never invent completion or bookings.',
    inputSchema: object({ id }, ['id']) },
  { name: 'creator_outcome_get', description: 'Read the full local proof outcome for agent planning and exact-version review.',
    inputSchema: object({ id }, ['id']) },
  { name: 'creator_source_register', description: 'Record an opaque media source and rights reference. This does NOT verify rights.',
    inputSchema: object({ id, source_type: field('string','Source type',{enum:['facility','creator','staff','synthetic']}),
      source_ref: field('string','Opaque asset reference, not URL/PHI'),
      rights_ref: field('string','Opaque rights record reference'),
      usage_scope: field('string','Licensed scope',{enum:['organic','paid','both']}) },
      ['id','source_type','source_ref','rights_ref','usage_scope']) },
  { name: 'creator_storyboard_propose', description: 'Propose hook/story/CTA; explicitly flag clinical claims and disclosures.',
    inputSchema: object({ id, hook: field('string','Hook'), story: field('string','Middle'),
      cta: field('string','CTA'), claims_present: field('boolean','Does this propose any treatment/health claim?'),
      disclosure_present: field('boolean','Is a visible material-connection/synthetic disclosure included?') },
      ['id','hook','story','cta','claims_present','disclosure_present']) },
  { name: 'creator_review_request', description: 'Request owner/clinical review; does not approve or notify anyone.',
    inputSchema: object({ id }, ['id']) },
  { name: 'creator_render_plan_prepare', description: 'Prepare an unsubmitted, non-billable 30s+15s external render plan after separate approval.',
    inputSchema: object({ id, provider: field('string','Candidate provider',{enum:['motion-master','montage']}),
      idempotency_key: field('string','Stable opaque job key'),
      max_cost_usd: field('number','Planning cap, not spend authorization',{minimum:0,maximum:1000}) },
      ['id','provider','idempotency_key','max_cost_usd']) }
];
const operations = {
  creator_outcome_create: a => ['POST', '/v1/outcomes', a],
  creator_outcome_status: a => ['GET', '/v1/outcomes/' + encodeURIComponent(a.id) + '/summary'],
  creator_outcome_get: a => ['GET', '/v1/outcomes/' + encodeURIComponent(a.id)],
  creator_source_register: a => ['POST', '/v1/outcomes/' + encodeURIComponent(a.id) + '/source', withoutId(a)],
  creator_storyboard_propose: a => ['POST', '/v1/outcomes/' + encodeURIComponent(a.id) + '/storyboard', withoutId(a)],
  creator_review_request: a => ['POST', '/v1/outcomes/' + encodeURIComponent(a.id) + '/review-request', {}],
  creator_render_plan_prepare: a => ['POST', '/v1/outcomes/' + encodeURIComponent(a.id) + '/render-plan', withoutId(a)]
};
function withoutId(a) { const { id: _id, ...rest } = a; return rest; }
function endpoint(env) {
  const url = new URL(env.CREATOR_STUDIO_API_URL ?? 'http://127.0.0.1:8787');
  if (url.protocol !== 'http:' || !['127.0.0.1','localhost'].includes(url.hostname) ||
      url.username || url.password || url.pathname !== '/' || url.search || url.hash)
    throw new Error('MCP proof bridge accepts loopback HTTP only; remote production transport not implemented.');
  return url.origin;
}
export async function callTool(name, args = {}, env = process.env) {
  if (!operations[name]) throw new Error('Unknown tool.');
  if (!args || typeof args !== 'object' || Array.isArray(args)) throw new Error('Arguments must be an object.');
  const token = env.CREATOR_STUDIO_AGENT_TOKEN;
  if (!token) throw new Error('Agent credential not configured.');
  const [method, path, body] = operations[name](args);
  const res = await fetch(endpoint(env) + path, { method,
    headers: { authorization: 'Bearer ' + token, ...(method === 'POST' ? {'content-type':'application/json'} : {}) },
    ...(method === 'POST' ? { body: JSON.stringify(body) } : {}),
    redirect: 'error', signal: AbortSignal.timeout(8000) });
  const data = await res.json();
  if (!res.ok) throw new Error(String(data.error ?? 'API_ERROR') + ': ' + String(data.message ?? 'Request denied.'));
  return data;
}
export function startMcp(env = process.env) {
  const input = createInterface({ input: process.stdin, crlfDelay: Infinity });
  const send = value => process.stdout.write(JSON.stringify(value) + '\n');
  input.on('line', async line => {
    let message;
    try { message = JSON.parse(line); }
    catch { return send({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }); }
    if (message?.id === undefined) return; // notifications have no response
    const { id: requestId, method, params = {} } = message;
    try {
      let result;
      if (method === 'initialize') result = { protocolVersion: '2024-11-05',
        capabilities: { tools: {} }, serverInfo: { name: 'crown-core-creator-studio', version: '0.2.0' } };
      else if (method === 'ping') result = {};
      else if (method === 'tools/list') result = { tools };
      else if (method === 'tools/call') {
        if (!operations[params.name]) throw Object.assign(new Error('Unknown tool.'), { rpcCode: -32602 });
        try {
          const data = await callTool(params.name, params.arguments ?? {}, env);
          result = { content: [{ type: 'text', text: JSON.stringify(data) }], isError: false };
        } catch (e) {
          result = { content: [{ type: 'text', text: String(e.message).slice(0, 300) }], isError: true };
        }
      } else throw Object.assign(new Error('Method not found.'), { rpcCode: -32601 });
      send({ jsonrpc: '2.0', id: requestId, result });
    } catch (e) {
      send({ jsonrpc: '2.0', id: requestId, error: { code: e.rpcCode ?? -32603, message: e.message } });
    }
  });
}
if (process.argv[1] && process.argv[1].endsWith('/mcp.mjs')) startMcp();
