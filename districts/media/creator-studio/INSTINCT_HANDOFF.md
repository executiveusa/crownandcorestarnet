# CC-CREATOR-SERVER — final Instinct + Paperclip + Hermes + Buffer Blaster handoff

**Mission:** `CC-CREATOR-SERVER-2`. **Owner:** Crown & Core. **Status:** source/API/MCP/CLI code tested with mocks; **no live server wiring, video render, source-asset upload, customer data or production deployment proven**.

**Code chain (do not merge out of order):** [Buffer Blaster security PR #119](https://github.com/executiveusa/buffer-blaster-/pull/119) → [Crown & Core Creator Studio PR #26](https://github.com/executiveusa/crownandcorestarnet/pull/26) → [Creator-to-Buffer bridge PR #28](https://github.com/executiveusa/crownandcorestarnet/pull/28) (currently stacked on #26). **Paperclip/Instinct identity blocker:** [StarNet issue #25](https://github.com/executiveusa/crownandcorestarnet/issues/25). **Human review:** [Issue #27](https://github.com/executiveusa/crownandcorestarnet/issues/27). No MACS or other business identity or data may be merged into Crown & Core.

**Read FIRST:** [full-stack audit](./FULL_STACK_WIRING_AUDIT_2026-11-12.md) (uploaded Full Stack Wiring Audit v2 methodology), [OPERATIONS.md](./OPERATIONS.md), [PRD.md](./PRD.md), [agent-workflow.json](./agent-workflow.json), canonical StarNet `districts/media/references/COMMERCIAL_STUDIO_CONTRACT.md` and `_shared/policy/HEART_AND_SOUL.md`.

## Target and definition of done

Lethia tells **existing Instinct**: “Make a truthful, warm 30-second video introducing Crown & Core, and a separate 15-second cut, using our licensed, real footage.” Instinct calls the **eleven agent-only Creator Studio MCP tools** via existing authenticated Paperclip task scheduling; Hermes can coordinate only bounded existing Paperclip jobs. StarNet validates rights, version, clinical screening and owner decisions. **Buffer Blaster** is the separately owned media-plan/asset engine, accessed with a **server-only scoped integration**, not by giving Buffer's operator token to Instinct. The final human-approved deliverables are *actual* 30-second + 15-second, 1080×1920 H.264 MP4 files with independent ffprobe and SHA-256 receipts.

**Do NOT claim target achieved** until a real, approved source is ingested, both distinct MP4s exist, exact file QA passes, owner reviews, and the provider job receipt is reconciled. The current Buffer factory does **NOT** meet this contract: it makes 10s+10s synthetic first-person UGC and requires a wallet. No paid ads, creator outreach or public publishing is authorized by this handoff.

## Task 0 — independent review and merge gates (BLOCKING)

1. Inspect exact current PR heads for **#119, #26, #28**. Buffer #119 must pass Python API, frontend/route, Postgres migration, container/Compose and independent security review. Crown #26 and #28 need Node Creator Studio tests and the existing full StarNet `npm run verify`; #28's stacked base must be reconciled after #26 is approved/merged. Do not merge conflicts or rewrite other branches blindly.
2. **OpenCodeReview**: repo `executiveusa/open-code-review`; its standard workflow is pinned as `c8e4c02b6f0e9467b755fc7e24b2619f6854a6a4` in Buffer. **The review run #43372852877 FAILED** (2 of 2 reviewed files failed in the LLM provider/subtask; not a clean review). Verify model credentials/availability, retry through the existing authorized GitHub workflow, or get a separate qualified independent reviewer. Do not claim an OCR pass.
3. Examine flagged security/race/version issues, particularly broad Buffer operator token, Buffer workspace-scoped assets/consent, local SQLite durability, agent claim flags, owner/clinical identity binding, no blind provider retries, and external asset hash provenance. Fix only verified findings, one reversible PR at a time.
4. Obtain owner approval of brand/visual design and explicit approval to merge. Do NOT merge or deploy merely because tests pass.

## Task 1 — existing services READ ONLY

1. Resolve issue #25: inspect exact existing Paperclip URL/tenant/company/project and existing Lethia Instinct agent ID and supported MCP command registration. Do NOT create a new scheduler, company, agent or competing Hermes control plane. Confirm the agent actually accepts a task before claiming handoff.
2. Confirm actual **Buffer Blaster API** URL/version and deployed commit behind `GET /api/health`, authenticated `GET /api/studio/status` and `POST /api/mcp` (`initialize` and `tools/list`). Version string alone is insufficient: confirm the deployed build includes **workspace-scoped `GET /api/studio/references/{uuid}` from PR #119**.
3. Confirm Buffer's **real** `BUFFER_BLASTER_WORKSPACE_ID` equals the Crown & Core **authorized** workspace. Verify no unrelated clients, Tangles & Locs, MACS or another tenant shares the configured source list. Buffer owns its private Supabase schema `buffer_blaster` and wallet; StarNet does **not** read service-role keys, copy the DB or override provider costs.
4. Inventory existing owner-controlled private video vault and file ingest path, the actual **Motion Master / Montage / Buffer** backend capabilities, ffmpeg/ffprobe availability, source media policy/streaming limits, secrets manager, TLS gateway, JWT IdP, private SQLite/Postgres placement and rollback. The Buffer `POST /api/studio/references/upload` endpoint currently accepts only **images** (JPEG/PNG/WebP, max 25 MB) and is **not** a video import interface.

## Task 2 — isolated StarNet API/MCP/CLI and governed Buffer bridge

Use a reviewed checkout at the exact PR SHA and a separately approved **private encrypted** staging volume outside the repository. Node 22.23+; `node:sqlite` is experimental, single-host; verify backup/restore. StarNet API must stay bound to `127.0.0.1`, behind a reviewed authentication/TLS transport if accessed remotely.

**Server-only environment** (read real values from existing secret manager; no secrets in GitHub/chat/PR/Instinct prompts):

```bash
CREATOR_STUDIO_AGENT_TOKEN=<agent-only-secret>
CREATOR_STUDIO_OWNER_TOKEN=<local-proof-owner-secret>   # staging only, not for live MFA approval
CREATOR_STUDIO_RIGHTS_TOKEN=<independent-rights-secret>
CREATOR_STUDIO_OPERATOR_TOKEN=<trusted-operator-secret>
CREATOR_STUDIO_DB_FILE=<approved-absolute-private-state-path>
CROWN_BUFFER_API_URL=<verified-Buffer-FastAPI-HTTPS-origin>
CROWN_BUFFER_API_KEY=<private-Buffer-operator-API-token>
CROWN_BUFFER_WORKSPACE_ID=<actual-Crown-allowed-Buffer-workspace-UUID>
```

Configure all `CROWN_BUFFER_*` values together. The server will fail on a partially configured trio. The **Buffer operator credential belongs ONLY to the StarNet API process** (or a narrowly scoped service bridge), never to Instinct, Hermes, browser, MCP stdio process or CLI client.

```bash
# From the reviewed repo root after private environment injection:
node districts/media/creator-studio/src/api.mjs

# In a SEPARATE agent-only process environment, with reviewer/Buffer keys REMOVED:
env -u CROWN_BUFFER_API_KEY -u CREATOR_STUDIO_OWNER_TOKEN \
    -u CREATOR_STUDIO_CLINICAL_TOKEN -u CREATOR_STUDIO_RIGHTS_TOKEN \
    -u CREATOR_STUDIO_OPERATOR_TOKEN -u CREATOR_STUDIO_QA_TOKEN \
    -u CREATOR_STUDIO_PUBLISHER_TOKEN \
    node districts/media/creator-studio/src/mcp.mjs
```

In the reviewed local staging role process:
```bash
node districts/media/creator-studio/src/buffer-cli.mjs status
node districts/media/creator-studio/src/buffer-cli.mjs tools
```

These use StarNet's own loopback API with its **agent** credential and call only authenticated Buffer `GET /api/health`, `GET /api/studio/status`, or `POST /api/mcp` `tools/list`. The CLI does not accept the Buffer API key and cannot execute paid generation.

**Actual agent MCP catalog** must contain **11** tools, including `creator_buffer_status` and `creator_buffer_plan_sync`, and must NOT expose `execute_ugc_ad_factory`, Buffer generic `tools/call`, owner/clinical approval, creator outreach send, publication, render execute, wallet or spend tools.

## Task 3 — prove one source-backed zero-spend Crown & Core plan

1. Instinct, from a **real authenticated model-originated tool call**, creates a **Crown & Core-only** outcome (capture `creator_outcome_create`, ID, revision, timestamp and `creator_outcome_status` receipts).
2. Agents propose genuine approved facility footage (not a generated customer testimonial) and a claim-free storyboard. Independently validate source SHA, rights contract/channel/expiry, and a clinician screens **every** medspa film. Record actual owner/clinical exact-version approvals.
3. Trusted operator prepares a **no-execution** Crown render plan. Independent rights role verifies the grant and source hash. The existing source MUST already have an actual Buffer UUID within the approved workspace.
4. **Rights role only** binds the actual Buffer reference to that StarNet version, after live readback of `GET /api/studio/references/{uuid}`:
```bash
node districts/media/creator-studio/src/buffer-cli.mjs bind <outcome-id> <version> <verified-buffer-source-uuid>
```
5. The agent invokes `creator_buffer_plan_sync` or:
```bash
node districts/media/creator-studio/src/buffer-cli.mjs plan <outcome-id>
```
This calls **only** `POST /api/studio/ugc/plans` then `GET /api/studio/ugc/plans/{plan_id}`; requires response `backend:supabase`, exact workspace, version, source UUID, no-spend `approval_state:draft`, `duration_seconds:30`, `estimated_cost_ceiling_cents:0`, and metadata `requested_cuts_seconds:[30,15]`. Capture the real durable Buffer plan UUID and StarNet audit receipt. Verify replay with the same idempotency key creates no duplicate plan.

**This is a plan, not a rendered video. Stop if the Buffer backend returns Redis degraded mode, foreign workspace, mismatched UUID, missing rights/clinician, or an unsupported source reference. Do not use `/api/studio/ugc/factory/execute`.**

## Task 4 — compatible renderer capability (new reviewed bridge only if needed)

Before attempting paid media, show an **actual existing** supported Motion Master/Montage/Buffer footage-edit endpoint/CLI/worker that:
- ingests a real **private licensed source-video** via verified, size-bounded streaming/object-vault path, with hash and consent checks;
- returns **two different final MP4 files, 30s and 15s**, H.264 1080×1920, with authorized soundtrack/typography and no fabricated patient;
- respects a distinct owner-approved render budget and Buffer's own active wallet/spend gate if any external provider cost is required;
- emits unique provider job and asset receipt IDs, hashes, status, failure and idempotent reconciliation;
- can put actual files in the authorized private vault for independent StarNet QA.

If the existing engine has **no compatible render contract**, create a *separate bounded reviewed engineering patch* on the **existing Buffer/media provider**, implementing footage-based editing/clip extraction, streaming upload and signed receipts. Keep the code in the proper owner repository; **do not smuggle a new renderer into StarNet or bypass Buffer's spend wallet**. No unverified route name, fake job ID, mocked MP4 or 10s+10s testimonial substitution is acceptable. Owner must authorize even a small paid smoke test.

Run the scoped approved render using StarNet's existing `worker.mjs dispatch`, reconcile the actual provider job, and run `worker.mjs qa` on genuine private 30s+15s files; capture ffprobe/SHA-256 evidence. Then show the owner the real video and obtain exact-hash authenticated `film-approve`. Publishing/creator outreach/ads require **different** approvals and are not requested.

## Task 5 — independent operational proof, rollback and report

Verify source/rights/clinical rejection, Buffer missing credentials, foreign workspace ID, altered or stale source revision, mismatched plan, provider unavailable, duplicate idempotency key, incomplete video, revoked rights and simulated rollback. Prove SQLite restart and vault restore if approved. All tests must run on the actual reviewed and deployed SHA.

Report to issue #27 (no secrets or patient data):

```text
CC-CREATOR-SERVER-2
Crown_PR26_sha_ci_review:
Crown_PR28_sha_ci_review:
Buffer_PR119_sha_ci_review:
OpenCodeReview_run: provider failure / PASS with actual review receipt
live_Instinct_and_Paperclip_ids: verified privately / BLOCKED
real_model_originated_creator_tool_receipts:
Creator_MCP_tool_count: 11 / mismatch
Buffer_health_version_deploy_sha:
Buffer_MCP_tools_list_receipt:
Buffer_workspace_id_verified_privately: yes/no
Buffer_exact_reference_route_exists_live: yes/no
source_asset_hash_grant_scope_and_clinical_screening: verified / BLOCKED
Bufffer_canonical_plan_id_and_readback: real UUID / BLOCKED
duplicate_plan_prevented: PASS/FAIL
actual_30s_mp4_ref_sha_duration:
actual_15s_mp4_ref_sha_duration:
real_provider_job_receipt_or_render_contract_blocker:
final_owner_hash_approval: yes/no
published: no unless separately authorized
creator_outreach: no unless separately authorized
paid_media: not implemented
actual_provider_spend_usd: 0 unless separately authorized
private_storage_backup_restore: PASS/FAIL/BLOCKED
rollback_and_credential_revocation: PASS/FAIL/BLOCKED
unresolved_material_findings:
next_owner_decision:
```

**Release judgment:** **NOT READY** until independent review of all three PRs, actual server and workspace proof, one authentic 30s+15s video, separate approvals and rollback. Current client/operator authority is read-only/no-spend planning by default. A posted GitHub issue is **not** evidence Instinct received or accepted this mission.
