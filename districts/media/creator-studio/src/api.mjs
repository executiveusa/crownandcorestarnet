// Loopback-only local proof HTTP API. Not a production public service.
import http from 'node:http';
import { timingSafeEqual, randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync, renameSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStudio, StudioError } from './domain.mjs';
import { createPipeline } from './pipeline.mjs';
import { sqliteStore } from './sqlite-store.mjs';
import { createIdentityVerifier } from './identity.mjs';
import { createCreatorWorkflow } from './creators.mjs';
import { verifySignedEvent } from './webhooks.mjs';
import { requireOutsideRepository } from './private-path.mjs';
import { createBufferBlasterClient, createBufferLink } from './buffer-blaster.mjs';

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
export function createApiServer({ studio, tokens, identity = null, webhookSecrets = {}, bufferClient = null }) {
  if (!studio) throw new Error('studio required');
  if (!tokens?.agent || (!tokens?.owner && !identity))
    throw new Error('Agent credential and owner identity provider or local proof credential required.');
  const secrets = Object.values(tokens).filter(Boolean);
  if (new Set(secrets).size !== secrets.length) throw new Error('All configured role credentials must be distinct.');
  const pipeline = createPipeline(studio);
  const creators = createCreatorWorkflow(studio);
  const bufferLink = bufferClient ? createBufferLink(studio,bufferClient) : null;
  return http.createServer(async (req, res) => {
    try {
      const pathname = new URL(req.url, 'http://127.0.0.1').pathname;
      if (req.method === 'GET' && pathname === '/health')
        return json(res, 200, { service: 'crown-core-creator-studio', mode: 'LOCAL_PROOF',
          live_renderer: false, publication_enabled: false, paid_spend_enabled: false });
      // Authenticated machine-to-machine callbacks, no owner/agent credentials.
      const webhookMatch = pathname.match(/^\/v1\/webhooks\/(provider|attribution)\/([^/]+)$/);
      if (webhookMatch && req.method === 'POST') {
        const [,kind,id] = webhookMatch;
        const secret = webhookSecrets[kind];
        if (!secret) return json(res, 404, { error: 'NOT_CONFIGURED' });
        if (!String(req.headers['content-type']??'').toLowerCase().startsWith('application/json'))
          throw new StudioError('CONTENT_TYPE','JSON required.',415);
        const chunks = [];
        let size = 0;
        for await (const chunk of req) {
          size += chunk.length;
          if (size > 16384) throw new StudioError('TOO_LARGE','Webhook exceeds 16 KB.',413);
          chunks.push(chunk);
        }
        const raw = Buffer.concat(chunks).toString('utf8');
        const body = verifySignedEvent({raw,headers:req.headers,secret});
        const outcome = kind === 'provider' ?
          pipeline.providerResult(id,'operator',body) :
          pipeline.attribute(id,'operator',{...body,verified_source:true});
        return json(res, 200, { outcome });
      }
      const authorization = req.headers.authorization;
      let role = null;
      let actorRef = null;
      if (identity && typeof authorization === 'string' && authorization.startsWith('Bearer ') &&
          authorization.slice(7).split('.').length === 3) {
        const verifiedActor = identity.verify(authorization.slice(7));
        role = verifiedActor.role;
        actorRef = verifiedActor.actor_ref;
      } else {
        role = roleFor(authorization, tokens);
        // In identity mode, static owner/clinical proof credentials are never accepted.
        if (identity && ['owner','clinical'].includes(role)) role = null;
      }
      if (!role) return json(res, 401, { error: 'UNAUTHORIZED', message: 'Valid bearer token required.' });
      const actorPipeline = actorRef ? createPipeline(studio,{actorRef}) : pipeline;
      const actorCreators = actorRef ? createCreatorWorkflow(studio,{actorRef}) : creators;
      const agentOnly = () => {
        if (role !== 'agent') throw new StudioError('FORBIDDEN', 'Agent role required.', 403);
      };
      if (pathname === '/v1/buffer/status' && req.method === 'GET') {
        if (!bufferClient) return json(res, 503, { error: 'BUFFER_NOT_CONFIGURED' });
        return json(res, 200, { buffer: await bufferClient.status() });
      }
      if (pathname === '/v1/buffer/mcp-tools' && req.method === 'GET') {
        if (!bufferClient) return json(res, 503, { error: 'BUFFER_NOT_CONFIGURED' });
        const catalog = await bufferClient.tools();
        return json(res, 200, { buffer: { connected: true, ...catalog } });
      }
      if (pathname === '/v1/outcomes' && req.method === 'GET')
        return json(res, 200, { outcomes: studio.list() });
      if (pathname === '/v1/outcomes' && req.method === 'POST') {
        agentOnly();
        return json(res, 201, { outcome: studio.create(await readBody(req)) });
      }
      const match = pathname.match(/^\/v1\/outcomes\/([^/]+)(?:\/(source|storyboard|review-request|approvals|render-plan|summary|rights-verify|render-authorize|dispatch-reserve|provider-ack|provider-result|qa-verify|film-approve|publish-authorize|publish-reserve|publish-receipt|attribution|job-fail|rights-revoke|takedown-receipt|creator-candidate|creator-outreach|creator-outreach-authorize|creator-outreach-reserve|creator-outreach-sent|creator-release|buffer-source-bind|buffer-plan))?$/);
      if (!match) return json(res, 404, { error: 'NOT_FOUND' });
      const [, id, action] = match;
      if (req.method === 'GET' && !action) return json(res, 200, { outcome: studio.get(id) });
      if (req.method === 'GET' && action === 'summary') return json(res, 200, { summary: studio.summary(id) });
      if (req.method !== 'POST') return json(res, 405, { error: 'METHOD_NOT_ALLOWED' });
      if (action === 'buffer-source-bind') {
        if (role !== 'rights') throw new StudioError('FORBIDDEN','Rights service required.',403);
        if (!bufferLink) return json(res,503,{error:'BUFFER_NOT_CONFIGURED'});
        return json(res,200,{outcome:await bufferLink.bindSource(id,await readBody(req),'rights')});
      }
      if (action === 'buffer-plan') {
        agentOnly();
        if (!bufferLink) return json(res,503,{error:'BUFFER_NOT_CONFIGURED'});
        const body=await readBody(req);
        if (Object.keys(body).length) throw new StudioError('INVALID_INPUT','No provider inputs may be supplied by agent.',400);
        return json(res,200,await bufferLink.syncPlan(id,'agent'));
      }
      // Privileged pipeline routes are NEVER available through agent MCP.
      // The operator/QA/publisher credentials belong to separate trusted services.
      const creatorRoutes = {
        'creator-candidate': ['agent','proposeCandidate'],
        'creator-outreach': ['agent','prepareOutreach'],
        'creator-outreach-authorize': ['owner','authorizeOutreach'],
        'creator-outreach-reserve': ['operator','reserveOutreach'],
        'creator-outreach-sent': ['operator','recordSent'],
        'creator-release': ['rights','recordRelease']
      };
      if (creatorRoutes[action]) {
        const [requiredRole, method] = creatorRoutes[action];
        if (role !== requiredRole) throw new StudioError('FORBIDDEN', requiredRole + ' role required.', 403);
        return json(res, 200, { outcome: actorCreators[method](id, role, await readBody(req)) });
      }
      const pipelineRoutes = {
        'rights-verify': ['rights','verifyRights'],
        'render-authorize': ['owner','authorizeRender'],
        'dispatch-reserve': ['operator','reserveDispatch'],
        'provider-ack': ['operator','acknowledgeProvider'],
        'provider-result': ['operator','providerResult'],
        'qa-verify': ['qa','verifyQa'],
        'film-approve': ['owner','decideFinal'],
        'publish-authorize': ['owner','authorizePublish'],
        'publish-reserve': ['publisher','reservePublication'],
        'publish-receipt': ['publisher','published'],
        attribution: ['operator','attribute'],
        'job-fail': ['operator','failJob'],
        'rights-revoke': ['rights','revokeRights'],
        'takedown-receipt': ['publisher','recordTakedown']
      };
      if (pipelineRoutes[action]) {
        const [requiredRole, method] = pipelineRoutes[action];
        if (role !== requiredRole) throw new StudioError('FORBIDDEN', requiredRole + ' role required.', 403);
        return json(res, 200, { outcome: actorPipeline[method](id, role, await readBody(req)) });
      }
      if (action === 'approvals') {
        if (!['owner', 'clinical'].includes(role)) throw new StudioError('FORBIDDEN', 'Reviewer role required.', 403);
        return json(res, 200, { outcome: studio.decide(id, role, await readBody(req), actorRef) });
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
  const target = requireOutsideRepository(filename);
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
  const identity = env.CREATOR_OIDC_JWKS_JSON ? createIdentityVerifier({
    issuer: env.CREATOR_OIDC_ISSUER, audience: env.CREATOR_OIDC_AUDIENCE,
    jwks: JSON.parse(env.CREATOR_OIDC_JWKS_JSON)
  }) : null;
  if (!agent || agent.length < 24 || (!identity && (!owner || owner.length < 24)))
    throw new Error('Agent token and separate owner credential or configured OIDC required.');
  const store = env.CREATOR_STUDIO_DB_FILE ? sqliteStore(env.CREATOR_STUDIO_DB_FILE) :
    localStore(env.CREATOR_STUDIO_STATE_FILE);
  const studio = createStudio(store);
  const bufferSettings = [env.CROWN_BUFFER_API_URL, env.CROWN_BUFFER_API_KEY, env.CROWN_BUFFER_WORKSPACE_ID];
  if (bufferSettings.some(Boolean) && !bufferSettings.every(Boolean))
    throw new Error('All three private Crown Buffer Blaster integration settings are required.');
  const bufferClient = bufferSettings.every(Boolean) ? createBufferBlasterClient({
    baseUrl:env.CROWN_BUFFER_API_URL,token:env.CROWN_BUFFER_API_KEY,
    workspaceId:env.CROWN_BUFFER_WORKSPACE_ID
  }) : null;
  const server = createApiServer({ studio, identity, bufferClient, webhookSecrets: {
    provider: env.CREATOR_PROVIDER_WEBHOOK_SECRET,
    attribution: env.CREATOR_ATTRIBUTION_WEBHOOK_SECRET
  }, tokens: {
    agent, owner, clinical: env.CREATOR_STUDIO_CLINICAL_TOKEN,
    rights: env.CREATOR_STUDIO_RIGHTS_TOKEN,
    operator: env.CREATOR_STUDIO_OPERATOR_TOKEN,
    qa: env.CREATOR_STUDIO_QA_TOKEN,
    publisher: env.CREATOR_STUDIO_PUBLISHER_TOKEN
  } });
  const port = Number(env.CREATOR_STUDIO_PORT ?? 8787);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid port.');
  server.listen(port, '127.0.0.1', () => {
    console.log('Creator Studio LOCAL_PROOF API on http://127.0.0.1:' + port);
    console.log('No automatic rendering, publishing, customer contact or paid actions enabled.');
  });
  return server;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) startLocalServer();
