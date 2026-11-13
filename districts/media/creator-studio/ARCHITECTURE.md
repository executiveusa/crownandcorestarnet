# Creator Studio — Agent-first architecture and interface contracts

**Status:** v0.3 code-side implementation in review-ready PR #26; not a production deployment. See [OPERATIONS.md](./OPERATIONS.md) for the authoritative executable adapter and server contracts. The canonical rendering boundary is `districts/media/references/COMMERCIAL_STUDIO_CONTRACT.md`. The canonical approval and commercial policy is `_shared/policy/HEART_AND_SOUL.md`.

## A. System map

```text
 Owner speaks or sends short mobile message
       │
       ▼
 EXISTING INSTINCT (owner-facing identity, conversation and status)
       │   verified authenticated MCP/API request (not a raw voice approval)
       ▼
 EXISTING PAPERCLIP (single task queue, state, budgets and delegation)
       │
       ├── HERMES (bounded specialist coordinator INSIDE one assigned job)
       │      ├── Brief / Brand specialist → verified StarNet knowledge
       │      ├── Rights specialist        → private rights vault (future)
       │      ├── Creative specialist      → source-based storyboard
       │      └── QA specialist            → claims, asset, frame checks
       │
       ▼
 CROWN & CORE STARNET — CREATOR STUDIO
       ├── MCP stdio adapter ──┐
       ├── HTTP API ───────────┴─→ policy/state machine → private campaign store
       │                             │
       │                             ├── versioned approvals / audit receipts
       │                             ├── rights refs and claim refs
       │                             ├── renderer-neutral 30s + 15s job plan
       │                             └── source-backed outcome tracking
       │
       ├── Motion Master adapter (future, verified health + auth + contract)
       ├── Montage adapter       (future, verified health + auth + contract)
       └── Approved publication / attribution adapters (later, separate gates)
                              │
                              ▼
                       Verified MP4 + QA receipt
                              │
                              ▼
                   Instinct short review request
                              │
                    Authenticated owner approval
                              │
                              ▼
                Separate publish/spend approval (future)
```

**Ownership rule:** Instinct interprets and reports; Paperclip schedules; Hermes plans bounded specialist work, never runs a competing scheduler; Creator Studio enforces business invariants and records state; Motion Master/Montage actually render; Performance district verifies business impact. StarNet never trusts an agent's narrative as an execution receipt.

## B. Verified vs proposed technology

| Component | Implementation / proposal | Status |
| --- | --- | --- |
| Repository | `executiveusa/crownandcorestarnet` / `districts/media/creator-studio` | Verified |
| Local API | Node 22 built-in `node:http`, loopback-only, separate bearer roles, optional OIDC reviewer identity | **Implemented; not publicly exposed** |
| Local agent adapter | MCP stdio JSON-RPC, agent-only **nine** tools, calls API | **Implemented; Instinct runtime unconnected** |
| Domain | Source → storyboard → review → owner/clinical approval → non-executing render plan | **Implemented local proof** |
| Local state | Memory/JSON proof; private single-host transactional SQLite WAL and append-only audit table | **Implemented; encrypted volume and deployment pending** |
| Interface | Responsive minimal outcome/review prototype, no direct credential entry | **Design prototype** |
| Owner conversation | Existing Instinct + pinned RS256 OIDC MFA reviewer verifier | **Identity verifier implemented; voice/client/runtime unverified** (PR #24 / issue #25) |
| Queue and agent tasks | Existing Paperclip | Runtime **unverified** |
| Specialist delegation | Hermes as scoped task worker | **Proposed** until tested against Paperclip capabilities |
| Production database | Included single-host SQLite option; existing owner-controlled DB may be reused if required | **Code implemented; owner must approve runtime/backup and encryption** |
| Media vault | Owner-controlled private vault; ffprobe/SHA-256 QA for real 30s+15s H.264 cuts | **QA code implemented; actual media vault not connected** |
| Render provider | Exact-URL HTTPS bridge adapter, health, idempotent capped submit, signed result callback | **Adapter implemented; actual Motion Master/Montage endpoint unverified** |
| Attribution | HMAC-signed aggregate event ingest, dedupe and receipt-backed totals | **Code implemented; actual source not connected** |
| A2A | Optional agent-to-agent interoperability only where both endpoints are verified | **Not implemented** |

No second database, framework, cloud account, agent manager or paid service should be introduced without an inventory and owner decision.

## C. REST v1 — implemented local proof

Start with separate 24+ character `CREATOR_STUDIO_AGENT_TOKEN` and `CREATOR_STUDIO_OWNER_TOKEN`. `CREATOR_STUDIO_CLINICAL_TOKEN` is optional and must be distinct. Bind only `127.0.0.1`. All `/v1` routes require `Authorization: Bearer ...`; the proof server has no CORS and is not public.

| Method | Route | Role | Result |
| --- | --- | --- | --- |
| GET | `/health` | local | LOCAL_PROOF, no live renderer/publishing |
| POST | `/v1/outcomes` | agent | New versioned DRAFT |
| GET | `/v1/outcomes` | authenticated | Bounded summaries, Crown & Core only |
| GET | `/v1/outcomes/:id` | authenticated | Exact current record and receipts |
| GET | `/v1/outcomes/:id/summary` | authenticated | Short status, next action, unknown metrics |
| POST | `/v1/outcomes/:id/source` | agent | Opaque source/rights references; unverified |
| POST | `/v1/outcomes/:id/storyboard` | agent | Hook, story, CTA, explicit claims/disclosure flags |
| POST | `/v1/outcomes/:id/review-request` | agent | REVIEW_PENDING only when source/storyboard present |
| POST | `/v1/outcomes/:id/approvals` | owner/clinical | Exact-version decision; rights attestation / claim ref |
| POST | `/v1/outcomes/:id/render-plan` | agent | PLANNED_NOT_SUBMITTED; no provider call |

Examples (no real customer information):

```json
POST /v1/outcomes
{
  "outcome": "Create a trustworthy 30-second Crown & Core introduction film",
  "goal": "booking_intent",
  "placement": "instagram_reel",
  "creative_direction": "Use real authorized facility footage"
}
```

```json
POST /v1/outcomes/:id/source
{
  "source_type": "facility",
  "source_ref": "asset:one-place-001",
  "rights_ref": "rights:one-place-001",
  "usage_scope": "organic"
}
```

```json
POST /v1/outcomes/:id/storyboard
{
  "hook": "One place to feel at ease",
  "story": "Authorized Crown & Core exterior and interior footage",
  "cta": "Explore verified services",
  "claims_present": false,
  "disclosure_present": false
}
```

```json
POST /v1/outcomes/:id/approvals
{
  "version": 3,
  "decision": "approve",
  "rights_confirmed": true
}
```

Owner approval above is a **local credential demonstration**, not a production-grade identity-verified voice approval. A real owner channel must prove identity, action scope, exact content revision, freshness, replay protection and revocation.

## D. MCP — implemented agent-only tools

`creator_outcome_create`, `creator_outcome_status`, `creator_outcome_get`, `creator_source_register`, `creator_storyboard_propose`, `creator_review_request`, `creator_render_plan_prepare`.

The MCP bridge calls the local REST API. It has **no owner/clinical credential** and exposes no approve, publish, spend, booking, customer messaging or render-execution tool. The bridge rejects non-loopback URLs. Registration in Instinct and Paperclip is **not yet verified**.

## E. State machine and invariants

```text
DRAFT
  │ source ref + rights ref + storyboard + required disclosure
  ▼
REVIEW_PENDING
  ├── request changes → DRAFT (version increment; approvals cleared)
  ├── owner approves current version + attests rights
  └── clinical approves current version + approved claim ref (if applicable)
       ▼
READY_FOR_RENDER_PLAN
       │ agent selects candidate provider, idempotency key, planning cap
       ▼
RENDER_PLAN_READY  [PLANNED_NOT_SUBMITTED]
       │
       └── STOP: real adapter and separate spending/asset/publish gates unimplemented
```

Any source/storyboard change increments version, clears approvals and render plan. A stale decision is denied. Idempotency prevents duplicate render plans for one revision. The plan records `external_dispatch_enabled:false`, `publishing_enabled:false`, `paid_spend_enabled:false`, `provider_job_id:null`, `verified:false`.

The proof receipt chain is SHA-256 linked **within the local record**; it is not a cryptographically signed, immutable audit log. Production requires append-only independent receipt storage, verified actor identity and clock, integrity checks, and a retention policy.

## F. Production schemas (proposed, not deployed)

**Core entities:** `outcome` (tenant, objective, goal, owner, status, version); `asset` (opaque ref, checksum, source type, private vault location, identity class); `rights_grant` (release/contract ID, signer, channel, paid scope, expiry, revocation); `storyboard_revision` (shots, claim refs, disclosures, revision hash); `approval` (actor verified, role, exact revision hash, decision, action scope, timestamp, expiry, channel, signature); `render_job` (idempotency key, provider, approved budget, version, provider receipt); `artifact` (MP4 ref, SHA-256, dimensions, duration, QA); `campaign` (channel, exact published revision, approval, external ID); `attribution_event` (campaign/source ID, event type, verified origin, timestamp, non-PHI aggregate). All are Crown & Core tenant-scoped.

**Production API additions after security review:** `POST /v1/render-jobs` with explicit owner-approved cost, `GET /v1/render-jobs/:id`, signed callback endpoint, `POST /v1/review-challenges` and verified `POST /v1/review-decisions`, `POST /v1/publish-requests` (separate approval), `GET /v1/outcomes/:id/verified-metrics`. Never infer endpoint existence from provider README; prove deployed API versions.

**Implementation note:** The P0-only diagram and state machine below show the first contract. The executable v0.3 state machine additionally includes `RENDER_AUTHORIZED → DISPATCH_RESERVED → RENDERING → RENDERED → READY_FOR_FINAL_REVIEW → FILM_APPROVED → PUBLISH_AUTHORIZED → PUBLISH_RESERVED → PUBLISHED_VERIFIED`, plus `RIGHTS_REVOKED / TAKEDOWN_REQUIRED / TAKEN_DOWN`, signed callbacks, and permission-gated creator outreach. See `src/pipeline.mjs`, `src/creators.mjs` and [OPERATIONS.md](./OPERATIONS.md). No automatic external execution is triggered by agent MCP.

**Event envelope:** `{event_id, tenant_id, outcome_id, revision_hash, actor_id, actor_role, action, policy_version, source_refs, approval_refs, provider_receipt_ref, occurred_at, integrity_hash}`. Keep private identifiers in the private vault, not GitHub.

## G. Hermes / Paperclip delegation contract (proposed)

One Paperclip mission per outcome with fixed job ID, tenant, time/budget limit and allowed tool scopes. Hermes may run ephemeral specialists for:
1. **Truth:** retrieve only allowlisted Crown & Core service/brand sources from PR #24 knowledge MCP once verified.
2. **Rights:** inspect private vault references with authorized read scopes; unknown permission = block.
3. **Creative:** generate storyboard variants from verified assets; never claim a render.
4. **Compliance:** flag issues and route to human clinical/legal reviewers; never self-approve.
5. **Production:** prepare provider-neutral plan, then only dispatch through approved adapter and separate budget authorization.
6. **QA:** inspect real exported files, hash, duration, orientation, audio license and legibility.
7. **Performance:** join approved aggregate campaign data to qualified inquiries/bookings, no invented conversions.

Use Paperclip as **the only** authoritative scheduler. Hermes returns task receipts to Paperclip. Instinct returns a one-sentence outcome/status and requests only necessary approvals. If Paperclip cannot support Hermes worker invocation in the deployed version, use existing supported worker types; do not silently create a parallel queue.

## H. Trust boundaries and failure behavior

- **Voice spoofing:** transcripts are untrusted intents; production approvals need independently verified owner identity and exact-version challenge.
- **Agent prompt injection:** fetched creator/UGC content is data, not authority. Tools enforce policy even if Hermes/Instinct requests a forbidden action.
- **PHI/privacy:** never copy patient records, faces or contact details into GitHub, LLM prompts, logs or demo fixtures. Counsel determines HIPAA applicability; use appropriate authorization/BAA controls where required.
- **Creator rights:** opaque rights ID is not legal permission. Validate actual release, paid usage, expiration and revocation in private vault before render/publication.
- **Clinical and FTC/Meta:** medical claims and disclosures require qualified review; heuristic filters are only supplemental.
- **Tenant:** deny unrelated Tangles & Locs data even if available in a connected provider.
- **Secrets:** no token in URL, source file, browser localStorage, MCP response or GitHub issue. Use owner-controlled secret manager.
- **Provider callbacks:** reject unverified signatures, mismatched tenant/job/version, duplicate deliveries, unexpected costs and unsigned artifacts.
- **Retry:** idempotency key + provider-side reconciliation before any retry that could incur cost.
- **Outage:** stop, preserve draft and receipts, tell owner “blocked”; never claim a video or booking happened.
- **Rollback:** stop external dispatch first; disable integration credentials and routes; revert PR/deployment; retain audit evidence in private store.

## I. Test and release gates

P0 tests: node:test exercises authentication, role separation, exact-version review, rights/disclosure and synthetic restrictions, tenant denial, idempotency and no-dispatch. Dedicated GitHub Actions workflow runs independently of StarNet legacy verify.

P1 integration: existing Paperclip health/IDs, Instinct MCP model-originated tool receipt, provider metadata read-only proof, isolated private store, independent review, signed approval channel, one nonclinical zero/low-cost smoke job, real MP4 QA and rollback exercise.

P2 production: owner and clinical approvals, explicit paid-media budget, verified booking destination, approved campaign launch, conversion reconciliation and direct post-release verification. No merge or production release from P0 alone.
