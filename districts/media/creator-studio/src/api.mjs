// Loopback-only local proof HTTP API. Not a production public service.
import http from 'node:http';
import { timingSafeEqual, randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync, renameSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStudio, StudioError } from './domain.mjs';

const json = (res, status, body) => {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store', 'x-content-type-options': 'nosniff',
    'x-frame-options': 'DENY', 'referrer-policy': 'no-referrer' });
  res.end(JSON.stringify(body));
};
function roleFor(header, tokens) {
  const supplied = typeof header === 'string' && header.startsWith('Bearer ') ? header.slice(7) : '';
  for (const [role, secret] of Object.entries(tokens)) {
    if (!secret || !supplied) continue;
    const a = Buffer.from(supplied), b = Buffer.from(secret);
    if (a.length === b.length && timingSafeEqual(a, b)) return role;
  }
  return null;
}
async function readBody(req) {
  if (!String(req.headers['content-type'] ?? '').toLowerCase().startsWith('application/json'))
    throw new StudioError('CONTENT_TYPE', 'application/json required.', 415);
  let size = 0; const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 16384) throw new StudioError('TOO_LARGE', 'Body exceeds 16 KB.', 413);
    chunks.push(chunk);
  }
  try {
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!body || typeof body !== 'object' || Array.isArray(body))
      throw new Error('Expected object');
    return body;
  } catch { throw new StudioError('INVALID_JSON', 'A JSON object is required.', 400); }
}
export function createApiServer({ studio, tokens }) {
  if (!studio) throw new Error('studio required');
  if (!tokens?.agent || !tokens?.owner || tokens.agent === tokens.owner ||
      (tokens.clinical && [tokens.agent, tokens.owner].includes(tokens.clinical)))
    throw new Error('Separate agent and owner credentials required; clinical credential must be distinct.');
  return http.createServer(async (req, res) => {
    try {
      const pathname = new URL(req.url, 'http://127.0.0.1').pathname;
      if (req.method === 'GET' && pathname === '/health')
        return json(res, 200, { service: 'crown-core-creator-studio', mode: 'LOCAL_PROOF',
          live_renderer: false, publication_enabled: false, paid_spend_enabled: false });
      const role = roleFor(req.headers.authorization, tokens);
      if (!role) return json(res, 401, { error: 'UNAUTHORIZED', message: 'Valid bearer token required.' });
      const agentOnly = () => {
        if (role !== 'agent') throw new StudioError('FORBIDDEN', 'Agent role required.', 403);
      };
      if (pathname === '/v1/outcomes' && req.method === 'GET')
        return json(res, 200, { outcomes: studio.list() });
      if (pathname === '/v1/outcomes' && req.method === 'POST') {
        agentOnly();
        return json(res, 201, { outcome: studio.create(await readBody(req)) });
      }
      const match = pathname.match(/^\/v1\/outcomes\/([^/]+)(?:\/(source|storyboard|review-request|approvals|render-plan|summary))?$/);
      if (!match) return json(res, 404, { error: 'NOT_FOUND' });
      const [, id, action] = match;
      if (req.method === 'GET' && !action) return json(res, 200, { outcome: studio.get(id) });
      if (req.method === 'GET' && action === 'summary') return json(res, 200, { summary: studio.summary(id) });
      if (req.method !== 'POST') return json(res, 405, { error: 'METHOD_NOT_ALLOWED' });
      if (action === 'approvals') {
        if (!['owner', 'clinical'].includes(role)) throw new StudioError('FORBIDDEN', 'Reviewer role required.', 403);
        return json(res, 200, { outcome: studio.decide(id, role, await readBody(req)) });
      }
      agentOnly();
      const body = action === 'review-request' ? {} : await readBody(req);
      const operations = {
        source: () => studio.registerSource(id, body),
        storyboard: () => studio.proposeStoryboard(id, body),
        'review-request': () => studio.requestReview(id),
        'render-plan': () => studio.prepareRenderPlan(id, body)
      };
      if (!operations[action]) return json(res, 404, { error: 'NOT_FOUND' });
      return json(res, 200, { outcome: operations[action]() });
    } catch (error) {
      if (error instanceof StudioError) return json(res, error.status, { error: error.code, message: error.message });
      // Never log request bodies, secrets or internal file paths.
      console.error('creator-studio request failed:', error?.name ?? 'Error');
      return json(res, 500, { error: 'INTERNAL_ERROR' });
    }
  });
}
export function localStore(filename) {
  if (!filename) return { initial: [], persist: () => {} };
  if (!isAbsolute(filename)) throw new Error('State path must be absolute and outside the repository.');
  const target = resolve(filename);
  const cwd = resolve(process.cwd());
  const rel = relative(cwd, target);
  if (!rel.startsWith('..') && rel !== '..') throw new Error('State must not be stored inside this public repository.');
  const initial = existsSync(target) ? JSON.parse(readFileSync(target, 'utf8')) : [];
  if (!Array.isArray(initial)) throw new Error('State must be a JSON array.');
  return { initial, persist: snapshot => {
    mkdirSync(dirname(target), { recursive: true, mode: 0o700 });
    const temp = target + '.' + randomUUID() + '.tmp';
    writeFileSync(temp, JSON.stringify(snapshot, null, 2), { mode: 0o600, flag: 'wx' });
    renameSync(temp, target);
  }};
}
export function startLocalServer(env = process.env) {
  const agent = env.CREATOR_STUDIO_AGENT_TOKEN, owner = env.CREATOR_STUDIO_OWNER_TOKEN;
  if (!agent || !owner || agent.length < 24 || owner.length < 24) throw new Error('Set distinct 24+ character local proof tokens.');
  const store = localStore(env.CREATOR_STUDIO_STATE_FILE);
  const studio = createStudio(store);
  const server = createApiServer({ studio, tokens: { agent, owner, clinical: env.CREATOR_STUDIO_CLINICAL_TOKEN } });
  const port = Number(env.CREATOR_STUDIO_PORT ?? 8787);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid port.');
  server.listen(port, '127.0.0.1', () => {
    console.log('Creator Studio LOCAL_PROOF API on http://127.0.0.1:' + port);
    console.log('No rendering, publishing, customer contact or paid actions enabled.');
  });
  return server;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) startLocalServer();
