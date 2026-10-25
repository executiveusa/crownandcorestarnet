# Commercial Production — External-Renderer Contract
Status: **DRAFT / EXTERNAL WORKER NOT CONNECTED**. Owner: `districts/media`.
Decision: **2026-10-24 — DO NOT BUILD OR RECOVER THE STANDALONE SOUND STUDIO IN THIS MILESTONE.** Crown & Core already has video/audio-capable applications. Delegate media jobs over their supported API, CLI, or MCP interfaces instead of duplicating sound tools or importing Claude's uncommitted sound application.

## One job
Produce a source-verified, rights-aware commercial brief and a human-approved production job for an existing renderer. Preserve client truth and creative approval. No direct publishing or clinical claims without named authorization. Prefer delivery of the first real approved film over building a new editing dashboard.

## Canonical ownership and providers
1. **Crown & Core STARNet**: brief, owner/clinical review, approvals, budget, job routing, immutable receipts, published-content decisions. No local rendering/audio workstation inside STARNet.
2. **Motion Master** (`https://github.com/executiveusa/motionmaster`): motion direction, storyboarding and code-built compositions. Its repository describes an MCP service with `plan_video`, `build_composition`, `build_hyperframes_composition`, and `mix_footage`; and a HyperFrames generator CLI with `generator/render.sh`. These are documented interfaces, not a live connection yet. Its plugins/MCP/generator are proprietary owner code; the separate Montage bridge is AGPL-3.0.
3. **Montage (currently branded YAPPY-CLIPZ in repo)** (`https://github.com/executiveusa/pauli-montage-video-agent`): footage ingestion, editing, audio/music/voice, render/export and QA. Its README advertises CLI/API/MCP surfaces. Treat future/planned command and API families as unverified for deployment until a smoke test on the actual running version succeeds.
4. **Verified Motion Master → Montage bridge** (`https://github.com/executiveusa/motionmaster/blob/main/bridge/README.md`): an existing TypeScript client over Montage public HTTP/MCP. Documented reads include `GET /api/health`, `GET /api/projects`, `GET /api/project/{id}/state`; timeline operations `timeline_get`, `timeline_replace`, `project_validate`. The bridge itself does not render. Its `buildExplainerTimeline` prepares footage+graphic composition. The bridge is separately AGPL-3.0; do not vendor it into STARNet.
5. **Synthia W7**: governed commercial workflow, creative critique and explicit cost authorization, not another video renderer.
6. **fal.ai**: optional paid generation for a shot, only on per-job explicit budget/owner approval. Do not generate footage that falsely represents a patient, provider, facility, treatment, or outcome.
7. **Openverse, Clipwing, Earshot**: **NOT CURRENT MILESTONE DEPENDENCIES**. Only use through an already licensed/operational external service when necessary, with asset provenance preserved. Do not build a catalog, sonic-logo editor, SFX review UI or independent audio mixer now.

## MVP user experience
An authorized owner asks STARNet to create a commercial. STARNet presents:
- A one-screen creative brief (audience, placement, story, duration, claims status).
- Real approved image/video selections and license provenance (no fabricated people/proof).
- Motion Master or Montage as the rendering destination, with a reason, estimated external cost and exact chosen engine.
- A reviewable draft via a link or stored result returned by the provider. Never invent a render URL or job completion.
- Explicit owner approval before publication and an audit trail of exactly which version was released.

**No Sound Studio buttons, sample picker, audio-catalog import or internal audio render stage.** An external worker may include audio if it is already capable. Accept optional licensed soundtrack or SFX references in job specs but do not make them prerequisites for a claim-free first video.

## Minimum future adapter contract (design only; not deployed)
Request: `{job_id, tenant_id, destination, renderer_version, brief_ref, asset_refs, rights_refs, approved_claim_refs, dimensions, duration_seconds, max_cost_usd, callback_ref}`.
Response: `{job_id, provider_job_id, status, artifact_refs, artifact_hashes, cost_actual, qa_receipts, error}`.
Statuses: `DRAFT | WAITING_FOR_APPROVAL | QUEUED | RUNNING | RENDERED | VERIFIED | FAILED`.
- Tokens/keys live only in destination-specific server secrets. STARNet stores no vendor credentials in repo, text briefs, or public URLs.
- Cross-business source media never crosses business tenants without explicit authorization.
- A plan/queue acknowledgement is not a render. A render is not an approved advertisement.
- No retry that risks duplicate paid generation without idempotency proof.

## First outcome
Finish the genuine Crown & Core **“One place”** 30-second private film and its 15-second cut, using the real storefront/official emblem, existing script and footage where verified. Audio is optional for the first render. Then do Lethia's real founder video. The T-Shape 2 explainer remains blocked pending clinician-approved claims and verified booking details. Tangles & Locs requires separate brand and access controls.

## Verification before claiming live integration
Inspect actual Motion Master and Montage deployed versions; confirm API/MCP/CLI authentication and callable operations with a read-only health/metadata smoke test; run one synthetic nonclinical test job with budget cap and receipts; verify exported MP4, playable duration/orientation, typography/readability, rights, provenance and approval. Do not change Montage's split video hero or take over its existing editor.

## Historical note
Prior merged PR #22 documented Claude's *uncommitted* Sound Studio implementation and missing source. That was an accurate record as of the audit; **source recovery is no longer on the critical path**. Preserve it only as historical context. The decision above supersedes any earlier request to build/recover the standalone SFX system.
