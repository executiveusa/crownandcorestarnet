# Instinct / Paperclip / Hermes — Creator Studio server handoff

**Mission ID:** `CC-CREATOR-P1`. **Target:** existing owner-controlled Crown & Core StarNet deployment. **Code:** draft PR #26, `districts/media/creator-studio/`. **Precondition:** issue #25 identifies the existing authenticated Paperclip server/company/project/Instinct agent. **Mode:** read-only discovery and isolated local proof first; no production release or spending.

## 0. Operator contract

- Existing **Instinct** is the owner-facing agent. Existing **Paperclip** is the sole authoritative task orchestrator. **Hermes** may coordinate scoped specialists as one Paperclip worker only if the deployed runtime supports that pattern.
- Do not create duplicate Paperclip companies, agents, queues, databases or hosting projects.
- Do not touch Tangles & Locs or any unrelated Supabase/other business project.
- Do not copy PHI, patient media, signed releases, credentials, private agreements or customer contact information into this public GitHub repository, agent prompts or issue comments.
- Do not give Instinct/Hermes the owner or clinical reviewer credentials.
- The Creator Studio API and MCP are **loopback-only local proof**; they cannot be safely exposed publicly as written.
- No public posting, paid ads, creator outreach, booking changes, external rendering or customer messages are authorized by this mission.

## 1. Preflight — evidence, not assumptions

1. Confirm exact reviewed PR #26 commit and CI workflow `creator-studio.yml` result; record SHA and run URL.
2. Run `node --test districts/media/creator-studio/tests/*.test.mjs` and existing `npm run verify`. Capture outputs and failures without secrets.
3. Confirm existing Paperclip URL, company ID, project ID, agent ID and deployed version through authenticated read-only calls. See issue #25. Do not create missing identities as a shortcut.
4. Confirm the existing Instinct runtime supports stdio MCP registration or an approved adapter. The PR #24 knowledge MCP is separate and unmerged; do not assume its tools are registered.
5. Inventory existing Motion Master/Montage deployments. Validate only their real health/auth/version/API or MCP tool list; documentation is not a live API receipt.
6. Confirm the correct Crown & Core private data/media vault, ownership, tenant, consent and access policy. If unknown, **STOP**.

## 2. Local proof startup — no live business data

Use secure environment injection from the owner-controlled secret store. Example shell commands use placeholders, not real credentials:

```bash
# Execute from the repository root, in an isolated local/staging environment.
export CREATOR_STUDIO_AGENT_TOKEN="<24+ random chars from private secret manager>"
export CREATOR_STUDIO_OWNER_TOKEN="<DIFFERENT 24+ random chars from private secret manager>"
# Optional, separate and NEVER passed to the Instinct/Hermes process:
# export CREATOR_STUDIO_CLINICAL_TOKEN="<separate clinician secret>"
# Optional local proof persistence outside the public repository:
# export CREATOR_STUDIO_STATE_FILE="/var/lib/crown-core/creator-studio/state.json"
node districts/media/creator-studio/src/api.mjs
```

API binds `127.0.0.1:8787` by default. State is **in memory** unless `CREATOR_STUDIO_STATE_FILE` is explicitly set. File mode is 0600 and path must be absolute and outside repo. This is not a production database, encrypted vault, HIPAA solution, signed approval system or distributed queue.

Run the MCP adapter in the **same local trust boundary** as the API, with only the agent token:

```bash
export CREATOR_STUDIO_API_URL="http://127.0.0.1:8787"
node districts/media/creator-studio/src/mcp.mjs
```

MCP uses line-delimited JSON-RPC over stdio; do not expose its stdin/stdout as a public socket. For initial local smoke:

```bash
printf '%s\n' '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}' \
 '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}' \
 | node districts/media/creator-studio/src/mcp.mjs
```

Expected: server info `crown-core-creator-studio`, seven `creator_*` tools, **no approval/publish/spend tools**.

## 3. Agent-originated acceptance

After existing Instinct MCP registration is verified, issue a real owner-safe instruction (no PHI):

> “Create a Crown & Core owned-media outcome for a 30-second ‘One place’ film and a 15-second cut using authorized real facility footage. Do not claim anything was rendered or published.”

Capture **actual model-originated** `creator_outcome_create` and `creator_outcome_status` calls, with request/response IDs, authenticated agent identity, timestamp, tenant, returned outcome ID and status `DRAFT`. Do not substitute scripted curl calls or local fixtures as evidence of agent integration.

Then exercise agent tools with **synthetic opaque source and rights references** and a claim-free storyboard; `creator_review_request` should yield `REVIEW_PENDING`. Demonstrate that:
- agent cannot approve via MCP or REST;
- wrong tenant and stale version are denied;
- synthetic fake testimonial is denied;
- clinical claim cannot bypass clinical approval;
- render plan cannot be prepared before approval;
- even after local owner proof approval, render plan is `PLANNED_NOT_SUBMITTED` and never calls a provider.

Never put a real owner token in a model's context. For a production owner approval, build an authenticated owner challenge channel binding identity, asset/version hash, scope, expiry and replay prevention; the P0 bearer demo is **not** a voice approval system.

## 4. Hermes task graph — proposal for existing Paperclip

```text
PAPERCLIP MISSION: CC-CREATOR-P1
  tenant: crown-and-core
  budget_usd: 0 (proof)
  deadline: bounded
  authority: draft/read only
  entry: existing Instinct
  worker: Hermes (only if supported in deployed runtime)
  specialists:
    - brand-truth: read allowlisted verified knowledge
    - rights: validate opaque refs against approved vault
    - creative: propose script/shot list and 30s/15s cutdowns
    - safety: check rights/disclosures/clinical-claim flags; escalate
    - provider-inspection: read-only health/capabilities
  output:
    - outcome_id, exact version, rights status, storyboard
    - task receipts, blocked reasons, next approval
  prohibited:
    - uncontrolled subagent creation
    - customer outreach, posting, bookings, spend, external rendering
```

If Hermes cannot be invoked as a scoped worker by the existing Paperclip deployment, **report the actual supported interface** and use the current Paperclip worker pattern. Do not create a competing orchestrator.

## 5. Future renderer integration gate — separate approval

Only after the existing renderer endpoint/version is proven and the owner authorizes a **capped test**:
1. Read-only provider health and supported API/MCP operations.
2. Verify asset rights, private vault access, allowed channel and consent.
3. Verify approved exact storyboard/claim revision and signed production budget.
4. Send one nonclinical synthetic test job with stable idempotency key and capped cost.
5. Capture provider job ID, response status, callback signature, output hash, playable MP4 duration/9:16 orientation, typography and audio license QA.
6. For real “One place” 30s+15s film, use only approved real Crown & Core media and repeat QA.
7. Present preview via authenticated owner channel. **Rendering approval ≠ publishing approval.**
8. Do not enable Meta/paid media until booking/lead-response/attribution gates pass.

This PR contains **no renderer adapter**; do not invent `MotionMaster.generateVideo` or `Publisher.launchAd` as deployed endpoints.

## 6. Deliverables to report on GitHub

Report on the designated server issue (no secrets):

```text
CC-CREATOR-P1
repo_sha:
CI_run:
node_tests:
paperclip_url_redacted:
paperclip_company/project/agent_ids: verified privately (yes/no)
instinct_mcp_registration: verified / blocked
model_originated_creator_outcome_create: receipt ID or blocked
model_originated_creator_outcome_status: receipt ID or blocked
wrong_tenant_denied: pass/fail
agent_approval_denied: pass/fail
provider_health: actual deployed version + read-only receipt / blocked
private_crown_core_vault: verified / blocked (no identifying data)
rendered_mp4: none until separate approved test
publication: none
spend_usd: 0
rollback_test:
remaining_blockers:
human_approval_needed:
```

## 7. Release decision and rollback

**Do not merge PR #26 or deploy to production** until independent security/clinical/privacy review, owner design approval, correct tenant and secrets, verified real agent call, and direct staging verification. PR #24 and issue #25 remain separate dependencies.

Rollback local proof: stop `src/api.mjs`, stop `src/mcp.mjs`, revoke proof credentials, remove private local proof state according to retention policy, close PR #26 if rejected. No customer-facing action should have occurred.

## 8. Next exact task

Resolve issue #25's existing Paperclip identity/runtime first; then run the above **agent-originated** Creator Studio proof. Report a blocked gate as blocked. The owner may approve the next production connector only after reviewing real evidence.
