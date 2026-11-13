# Creator Studio — implementation, integration and operations contract (v0.3)

**Scope:** Crown & Core-only, agent-first product within StarNet. **Status:** code-side implementation; NOT live until Instinct/Paperclip/Hermes and external providers are connected and independently verified. No MACS, BufferBlaster or new orchestration service.

## 1. Runtime and modes

Node **22.23+**; no third-party runtime packages. `node:sqlite` in Node 22 is experimental and must be evaluated/approved before production. The default API is loopback-only; an owner-controlled authenticated TLS gateway is required for any remote access. Do **not** expose `127.0.0.1:8787` directly to the internet.

```bash
node --test districts/media/creator-studio/tests/*.test.mjs
node --check districts/media/creator-studio/src/worker.mjs
```

- **Offline UX:** open `index.html`. It never records audio, calls an agent or sends data.
- **Memory proof:** start `src/api.mjs` with agent/owner local proof tokens.
- **Single-host persistent staging:** set `CREATOR_STUDIO_DB_FILE` to an absolute path **outside** the repo, on a private encrypted volume. SQLite WAL, synchronous FULL, transactionally stored snapshots and append-only receipt table. One writer/API instance only; do not scale to multiple processes or hosts. Back up the DB and WAL together using SQLite's supported backup procedure; restore in staging and verify receipt chains.
- **Authenticated reviewer mode:** configure pinned RS256 OIDC JWKS, HTTPS issuer and audience; owner/clinical JWTs must carry `tenant_id=crown-and-core`, `creator_studio_role=owner|clinical`, `amr` including `mfa`, and a max 15-minute lifetime. Static owner/clinical proof tokens are refused in this mode. This is a verified identity **API**, not a built-in OAuth login screen or voice biometrics. The existing Instinct channel must deliver identity-bound approvals through a separately authenticated owner client.
- **Production database choice:** the included SQLite mode is appropriate only for approved single-host non-PHI workloads. If existing Crown & Core infrastructure requires PostgreSQL, the server agent must inventory it and obtain approval for an adapter; no new Supabase project or unrelated tenant access.

## 2. Secret inventory (names only)

| Environment | Use | Access |
| --- | --- | --- |
| `CREATOR_STUDIO_AGENT_TOKEN` | Agent REST + stdio MCP | Instinct agent process only |
| `CREATOR_STUDIO_OWNER_TOKEN` | Local proof owner only | Never Instinct/Hermes |
| `CREATOR_STUDIO_CLINICAL_TOKEN` | Local proof clinician | Never Instinct/Hermes |
| `CREATOR_STUDIO_RIGHTS_TOKEN` | Rights review and revocation | Rights worker |
| `CREATOR_STUDIO_OPERATOR_TOKEN` | Render, metrics, outreach receipts | Trusted operator worker |
| `CREATOR_STUDIO_QA_TOKEN` | Independent MP4 QA receipt | QA worker |
| `CREATOR_STUDIO_PUBLISHER_TOKEN` | Organic publish reservation/receipt/takedown | Publisher worker |
| `CREATOR_STUDIO_DB_FILE` | Private SQLite file path | Server only |
| `CREATOR_OIDC_ISSUER`, `CREATOR_OIDC_AUDIENCE`, `CREATOR_OIDC_JWKS_JSON` | Pinned reviewer identity | Server only |
| `CREATOR_PROVIDER_WEBHOOK_SECRET`, `CREATOR_ATTRIBUTION_WEBHOOK_SECRET` | HMAC callbacks (32+ chars) | Trusted bridge only |
| `CREATOR_RENDER_HEALTH_URL`, `CREATOR_RENDER_SUBMIT_URL`, `CREATOR_RENDER_TOKEN` | Actual verified renderer bridge | Operator worker |
| `CREATOR_PRIVATE_MEDIA_VAULT` | Local private media root | QA worker |
| `CREATOR_PUBLISH_URL`, `CREATOR_PUBLISH_TOKEN` | Actual verified organic publisher bridge | Publisher worker |
| `CREATOR_OUTREACH_SEND_URL`, `CREATOR_OUTREACH_TOKEN` | Approved creator contact service | Operator worker |
| `CREATOR_STUDIO_ENABLE_ORGANIC_PUBLISH` | Must equal `yes` to allow publish CLI | Publisher worker |
| `CREATOR_STUDIO_ENABLE_CREATOR_OUTREACH` | Must equal `yes` to allow outreach CLI | Operator worker |

All role credentials must be distinct. Never place values in repo, PRs, issue comments, model prompts or browser localStorage. Rotate and revoke through the owner-controlled secrets manager.

## 3. Actual code-side workflow

```text
Instinct voice/text intent
  → agent MCP creator_outcome_create
  → creator_candidate_propose / creator_outreach_prepare (optional; UNSENT)
  → creator_source_register + creator_storyboard_propose
  → creator_review_request
  → owner storyboard approval and independent clinical screening for EVERY medspa render (MFA OIDC or isolated proof token)
  → creator_render_plan_prepare (NO EXECUTION)
  → rights-verify (rights officer, grant + asset hashes + expiry)
  → render-authorize (owner, exact revision + cost cap)
  → worker dispatch: provider health → dispatch-reserve → actual provider submit → provider-ack
  → signed provider webhook OR trusted operator provider-result
  → worker qa: real private 30s+15s H.264 files → ffprobe + SHA-256 → qa-verify
  → film-approve (owner, exact 30s+15s hashes)
  → [optional] publish-authorize (owner, organic only, booking/policy checks)
  → worker publish: publish-reserve → external organic post → publish-receipt
  → signed source-backed aggregate attribution; unknown metrics stay null
```

For creator collaboration, the agent can propose opaque creator profile refs and prepare a message. Owner approves **exact message hash, terms, fee cap, contact permission and expiry**. Worker `outreach` reserves before contacting an approved private service; no raw contact details appear in StarNet. Rights officer separately records a verified release. Agent never sends or approves.

**Revocation:** rights officer calls `rights-revoke`. If already published, state becomes `TAKEDOWN_REQUIRED` and `published:true` until a trusted publisher supplies a matching `takedown-receipt`. Do not mistake a revocation flag for completed removal.

## 4. Exact external renderer bridge contract

The adapter in `src/adapters.mjs` is **real HTTP code**, but it does not invent Motion Master/Montage endpoints. The existing deployed provider (or a minimal owner-controlled bridge) must expose these **configured exact URLs**:

- `GET CREATOR_RENDER_HEALTH_URL` with bearer token: `{"version":"<actual deployed version>"}`.
- `POST CREATOR_RENDER_SUBMIT_URL` with bearer token, JSON and `Idempotency-Key` header: request `{job_id,tenant_id,destination,brief_ref,asset_refs,rights_refs,approved_claim_refs,dimensions,cuts_seconds:[30,15],max_cost_usd,idempotency_key}`; response `{"accepted":true,"provider_job_id":"provider:opaque-id"}`.
- No assumed status endpoint. The bridge must deliver a signed callback or the operator must reconcile actual provider output before `provider-result`. Never auto-retry an ambiguous job.
- Only HTTPS or explicit loopback endpoints; health and submit must share the same configured origin. No redirects, credentials in URL or user-supplied endpoints.

A real rendered result includes `job_id`, `provider_job_id`, `version`, `provider_receipt_ref`, `status:"rendered"`, `cost_actual_usd` within owner cap, and two `artifacts` with `cut_seconds`, opaque `artifact_ref`, SHA-256 `sha256`. This is **not yet QA verified**.

## 5. Private QA handoff contract

The existing provider/bridge deposits approved MP4s into an owner-controlled private vault. Create a private manifest **outside GitHub**:

```json
{
  "outcome_id": "opaque-outcome-id",
  "job_id": "opaque-job-id",
  "qa_ref": "qa:independent-001",
  "files": [
    {"cut_seconds": 30, "artifact_ref": "artifact:30", "path": "/private/vault/30.mp4"},
    {"cut_seconds": 15, "artifact_ref": "artifact:15", "path": "/private/vault/15.mp4"}
  ]
}
```

`node src/worker.mjs qa <outcome-id> <private-manifest.json>` verifies both files with `ffprobe` and SHA-256. Requirements: regular files inside the configured vault, distinct H.264 streams, 1080×1920, duration within 0.6 seconds of target, 1 KiB–1 GiB, hashes matching the provider receipt. A successful test using mock ffprobe is **not** proof that real MP4s exist.

## 6. Operator CLI

From the repository root, after private env injection and operator approval:

```bash
node districts/media/creator-studio/src/worker.mjs inspect
node districts/media/creator-studio/src/worker.mjs dispatch <outcome-id>
node districts/media/creator-studio/src/worker.mjs qa <outcome-id> <private-manifest.json>
# Explicitly disabled until owner-approved release:
node districts/media/creator-studio/src/worker.mjs outreach <outcome-id> <outreach-id>
node districts/media/creator-studio/src/worker.mjs publish <outcome-id>
```

The last two require their distinct `ENABLE_*` switches. All side-effecting operations reserve state **before** calling the provider, preventing blind retries. If a network response is ambiguous, stop and reconcile manually by idempotency key. The operator CLI is **not** an autonomous background scheduler; existing Paperclip remains the only scheduler.

## 7. Signed callbacks

`POST /v1/webhooks/provider/:outcomeId` and `POST /v1/webhooks/attribution/:outcomeId` accept only signed JSON when the corresponding secret is configured. Required headers: `x-studio-timestamp` (Unix ms or seconds), `x-studio-event-id` (opaque), `x-studio-signature` (hex HMAC-SHA256 of `timestamp.event_id.raw_body`). Clock skew ±5 minutes. Payload `event_ref` must match the signed event ID. Provider callbacks can only advance an accepted `RENDERING` job; attribution requires already verified publication. Duplicate attribution IDs are rejected. Configure the external bridge to sign these exact envelopes; never place secrets in query strings.

## 8. What remains **server-only** after code review

- Verify existing Paperclip company/project/Instinct identity and register the nine agent-only MCP tools in the actual Instinct runtime.
- Verify Hermes supported worker invocation within the **existing** Paperclip job; no second scheduler.
- Bind owner-controlled TLS gateway, pinned OIDC IdP, roles, secret manager, SQLite encrypted volume or approved existing DB, backup/restore, private media vault and actual Motion Master/Montage provider endpoints.
- Prove an authenticated model-originated tool call, rights and owner identity, a nonclinical zero/low-cost provider smoke, real MP4 ffprobe+hash QA, preview and owner decision.
- Connect any optional creator contact, organic publisher or attribution provider **only with explicit separate owner approval**. Paid Meta ads are NOT implemented or authorized.
- Verify post-release state directly and demonstrate rollback.

## 9. Release, failure and rollback

**Code-side gate:** all Creator Studio tests + StarNet verify pass at exact reviewed SHA; independent code/security review and owner visual approval. **Staging gate:** actual live agent/provider/IdP/vault evidence. **Production gate:** separate owner authorization, clinical/legal approval as applicable, real asset and release proof, monitored rollback.

Rollback: disable outbound worker switches and revoke provider tokens first, stop API/MCP, restore prior deployment/revert PR, preserve private audit and published/takedown evidence. Never delete a real published post solely because a local DB reverted. If rights are revoked, a verified takedown is required.
