# CC-CREATOR-SERVER — final Instinct / Paperclip / Hermes connection handoff

**Owner:** Crown & Core. **Code PR:** #26 (`feat/crown-creator-studio-mvp`). **Related:** existing Paperclip identity issue #25, existing knowledge MCP PR #24, server mission issue #27. **State:** code-side implementation with 37 automated contract tests passing; **not deployed**. This handoff is intentionally issued **after** code-side implementation and tests.

**Read first:** [OPERATIONS.md](./OPERATIONS.md), [PRD.md](./PRD.md), [ARCHITECTURE.md](./ARCHITECTURE.md), [agent-workflow.json](./agent-workflow.json), [openapi.yaml](./openapi.yaml), canonical `districts/media/references/COMMERCIAL_STUDIO_CONTRACT.md` and `_shared/policy/HEART_AND_SOUL.md`.

## A. Operator mission

**Mode:** existing-infrastructure connection only; no new product code or duplicate services without explicit owner approval.

**Measurable target:** one authenticated, **model-originated** Instinct → MCP → Creator Studio outcome and status receipt; one isolated approved 30s+15s real MP4 render from the existing renderer; independent SHA-256/ffprobe QA; owner-reviewed exact film hashes; no unauthorized contact/post/spend. Report what actually works and what remains blocked.

**Constraints:** no PHI/customer identifiers in GitHub, logs, model prompts or demo; no unrelated tenant; no extra Paperclip company, agent, scheduler, DB or hosting project; no unapproved changes to existing Motion Master/Montage; no paid ads; no publication without a separate owner approval.

## B. Code-side inventory — DO NOT rebuild

- `src/domain.mjs`: Crown & Core-only outcome, storyboard, revision and owner/clinical review.
- `src/pipeline.mjs`: rights verification → owner render budget → reserved dispatch → provider result → independent QA → final film approval → separate organic publication → attribution; rights revocation and takedown.
- `src/creators.mjs`: creator shortlist, unsent outreach, owner exact-message approval, reserved contact, verified release.
- `src/api.mjs`: role-protected loopback REST and HMAC callback endpoints, optional OIDC reviewer identity.
- `src/mcp.mjs`: **nine agent-only stdio MCP tools**. No owner/clinical approval, outreach send, render execute, publication or spend tool.
- `src/sqlite-store.mjs`: private single-host transactional SQLite WAL, append-only receipt table; Node 22 experimental API.
- `src/identity.mjs`: pinned RS256 OIDC MFA JWT verifier; verified actor IDs in approval receipts.
- `src/adapters.mjs`: exact-URL HTTPS renderer, organic publisher and creator contact adapters. Endpoints **must be verified**, not guessed.
- `src/worker.mjs`: explicit `inspect`, `dispatch`, `qa`, `outreach`, `publish` commands; outbound side effects reserve state first and never auto-retry.
- `src/qa.mjs`: independent private H.264 1080×1920 30s/15s ffprobe and SHA-256 checks.
- `src/webhooks.mjs`: signed, timestamp-bound provider and attribution callbacks.
- `tests/*.test.mjs`: domain, REST, MCP stdio, SQLite restart, provider adapters, OIDC, rights, revocation, creator outreach, signed callbacks and QA.

**Code gate at handoff preparation:** 37/37 Creator Studio tests passed in GitHub Actions run `43358082939`. Resolve and record **the exact final PR head SHA and both CI runs** before operating.

## C. Step 1 — discover existing server, read-only

1. Resolve issue #25: confirm existing Paperclip URL/version, Crown & Core company/project IDs, Lethia's existing Instinct agent identity, and supported MCP registration. Do not create substitutes.
2. Inspect the actual deployed Motion Master and Montage (YAPPY-CLIPZ) read-only health/auth/API/MCP/CLI surface and the existing Motion Master → Montage bridge. Confirm which supports the adapter contract in `OPERATIONS.md`; if neither does, report a **bridge contract blocker**, do not invent an endpoint.
3. Confirm owner-controlled Crown & Core private media vault, encrypted persistent volume, backup/restore, trusted TLS gateway, OIDC issuer/JWKS, secret manager and network policy. No unrelated Supabase or business tenant.
4. Confirm `node --version` is 22.23+ and `ffprobe -version` works on the trusted QA host. Node 22 SQLite is experimental; approve single-host use or request an explicit existing-DB decision.
5. Read and independently review PR #26 security/clinical/privacy/brand boundaries. **Do not merge** until owner and independent review approve.

## D. Step 2 — isolated local API and MCP proof

Inject distinct 24+ character tokens from the private secret manager; never commit, paste or expose values. Start on loopback:

```bash
# From repository root on an isolated staging host.
export CREATOR_STUDIO_AGENT_TOKEN="<private-agent-token>"
export CREATOR_STUDIO_OWNER_TOKEN="<different-local-proof-token>"
export CREATOR_STUDIO_DB_FILE="/var/lib/crown-core/creator-studio/studio.sqlite"
node districts/media/creator-studio/src/api.mjs
```

The DB file path is illustrative; choose the actual owner-approved private encrypted volume outside repo. For real reviewer identity, configure `CREATOR_OIDC_ISSUER`, `CREATOR_OIDC_AUDIENCE`, `CREATOR_OIDC_JWKS_JSON` from the verified IdP and do **not** rely on local owner proof tokens. Configure separate rights/operator/QA/publisher credentials only in their respective trusted services.

MCP on the **same trust boundary**, with agent token only:

```bash
export CREATOR_STUDIO_API_URL="http://127.0.0.1:8787"
node districts/media/creator-studio/src/mcp.mjs
```

MCP handshake must list nine `creator_*` tools: outcome create/status/get, source register, storyboard propose, review request, render plan prepare, creator candidate propose and outreach prepare. **No agent approval or outbound action tools.**

Register this actual stdio MCP bridge in the existing Instinct runtime, using its supported registration method. Prove **real model-originated** `creator_outcome_create` and `creator_outcome_status` tool calls and receipts. A curl script, unit test or fixture alone does not count.

## E. Step 3 — configure owner/rights/clinical review

- Owner and clinical decisions require verified **separate** reviewer identity; in OIDC mode the server requires pinned RS256 JWT, correct issuer/audience/tenant, MFA and short lifetime. Do not give these tokens to Instinct, Paperclip or Hermes.
- Real voice “yes” is not sufficient by itself. Existing voice channel must authenticate the actor and bind the action to the exact revision and, for finished films, both SHA-256 hashes. A short authenticated mobile review is an allowed fallback.
- Rights officer must independently inspect actual release/contract, source asset hash, scope, expiry and revocation before `rights-verify`. A supplied `rights_ref` alone is not evidence.
- Clinical reviewer must approve any treatment claim. FTC material-connection/synthetic disclosures and current platform policies require qualified review.

## F. Step 4 — one approved real renderer smoke

1. Confirm provider's **actual** health URL/version and supported submit operation; configure exact HTTPS `CREATOR_RENDER_HEALTH_URL`, `CREATOR_RENDER_SUBMIT_URL`, `CREATOR_RENDER_TOKEN` privately.
2. Test `node districts/media/creator-studio/src/worker.mjs inspect`; record provider version. If the deployed provider does not match the bridge contract, **STOP** and report the minimal adaptation required for owner approval.
3. With authorized **nonclinical, non-patient** source media, record source and storyboard via MCP; obtain separate owner/clinical (if applicable), rights and capped render authorizations. Prepare a plan with a stable idempotency key.
4. Operator runs `node districts/media/creator-studio/src/worker.mjs dispatch <outcome-id>`. This reserves once, submits once, then records the real provider job ID. If ambiguous, reconcile provider-side; never auto-retry.
5. Receive a valid HMAC-signed `/v1/webhooks/provider/:id` callback or reconcile via authenticated operator `provider-result`. A provider acknowledgement is **not** a rendered film.
6. Deposit both actual MP4s in the private vault, with a private manifest. Run `node districts/media/creator-studio/src/worker.mjs qa <outcome-id> <private-manifest.json>`. This must independently prove 30s+15s, H.264, 1080×1920, SHA-256 matching provider receipt, playable assets and basic media checks.
7. Show the owner the real approved preview through the existing authenticated channel. Record exact-hash `film-approve` decision. **Do not publish yet.**

No model-generated patient, invented real facility imagery, synthetic testimonials, or unapproved clinical claims.

## G. Step 5 — optional contact, publication and attribution (separate owner approval)

- **Creator contact:** only after actual permission and exact message/terms/fee approval. Configure verified private contact service and `CREATOR_STUDIO_ENABLE_CREATOR_OUTREACH=yes` **only for the approved scoped test**; run worker `outreach`. Never expose raw contact details in StarNet.
- **Organic publication:** only after verified booking path, clinical/brand checks and a **separate** owner `publish-authorize` decision. Configure actual platform bridge and `CREATOR_STUDIO_ENABLE_ORGANIC_PUBLISH=yes` **only for the approved scoped test**; run worker `publish`. No paid Meta ads.
- **Attribution:** only signed source-backed aggregate events; verify actual booking/payment source and reconciliation. If absent, keep bookings/revenue `null`, not zero or fabricated.
- **Revocation:** a rights revocation after publication yields `TAKEDOWN_REQUIRED`; obtain and record real platform takedown receipt before reporting removal.

## H. Paperclip/Hermes mission contract

Read `agent-workflow.json`. **Paperclip is the only scheduler**. Hermes is a bounded specialist coordinator **inside one existing Paperclip job**, if supported; no persistent independent swarm. Allowed agent tools are exactly the nine MCP tools. Specialists can research approved brand truth, inspect opaque rights refs, propose scripts, check claims/disclosures and prepare plans; no agent can self-approve, contact, spend or publish. If the actual runtime lacks Hermes support, use the existing supported worker pattern and report the difference.

## I. Required evidence report to issue #27 (no secrets)

```text
CC-CREATOR-SERVER
exact_pr_sha:
creator_studio_CI_url: pass/fail
StarNet_verify_url: pass/fail
independent_security_review: approved / blocked
owner_visual_approval: approved / blocked
existing_paperclip_company_project_instinct_ids: verified privately / blocked
actual_instinct_mcp_tool_call_receipts: IDs / blocked
nine_agent_tools_no_approval: verified / blocked
tenant_and_wrong_role_denials: pass / fail
OIDC_MFA_reviewer_identity: verified / blocked
rights_release_and_asset_hash: verified / blocked
private_SQLite_or_existing_DB_backup_restore: verified / blocked
renderer_health_and_version: actual receipt / blocked
provider_job_id: actual receipt / not attempted
real_30s_15s_MP4_hashes_ffprobe_QA: actual receipts / not attempted
owner_final_hash_approval: verified / blocked
creator_contact: none unless separately authorized
organic_publication: none unless separately authorized
paid_meta_ads: NOT IMPLEMENTED
attributed_bookings_and_revenue: actual verified / unknown
actual_spend_usd: 0 unless separately approved and evidenced
rollback_exercise: pass / blocked
remaining_blockers:
next_owner_decision:
```

## J. Release and rollback

**Do not merge/deploy on code tests alone.** Independent code/security review, owner brand approval, real Instinct MCP receipt, verified provider, correct Crown & Core private vault and direct staging proof are required. Stop/revoke outbound workers first on rollback, preserve audit and external publication receipts, restore prior approved deployment, and report any still-live content honestly.

**No server connection or deployment is claimed by this handoff.** Assignment to issue #27 is a work request, not evidence that Instinct accepted or executed it.
