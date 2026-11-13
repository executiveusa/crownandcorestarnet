# Crown & Core Creator Studio × Buffer Blaster — Full-stack wiring audit v2.0

**Audit mode:** FULL, targeted to the end-to-end Crown & Core creator-video contract and its Buffer Blaster integration. **Date:** 2026-11-12, Mexico City / 2026-11-13 UTC. **Result:** **NOT RELEASE READY / PARTIAL**. No customer media or actual provider account was accessed. **The user-uploaded `full-stack-wiring-audit-v2.0.0.zip` skill was used as the methodology.**

## 1. Fingerprints and exact sources

| Repository | Tree/ref inspected | Role |
| --- | --- | --- |
| `executiveusa/crownandcorestarnet` | PR #26 `7560d2a74758f49dc0c357d8401066f59e229e03` + stacked PR #28 | Source of truth: Crown & Core outcome, rights, clinical screening, owner approval, final video hash and publishing decisions |
| `executiveusa/buffer-blaster-` | main tree `ff12fcd996256f33ac2605635deb38c95d3a9c24` + security PR #119 | Source of truth: video plan, asset ledger, generation budget/provider state within its own workspace |
| `executiveusa/open-code-review` | main tree `6386895e7cfac419bd7a9cf4795e8b824a6e3ced`; referenced reusable workflow pinned `c8e4c02b...` | Independent code-review tooling only; not a video engine |

**Stack:** StarNet/Creator Studio Node 22 ES modules, native `node:http`, `node:sqlite` WAL (experimental), stdio MCP, OIDC RS256, SHA-256/HMAC, private ffprobe QA and an offline HTML prototype. Buffer Blaster FastAPI/Pydantic backend, REST, JSON-RPC HTTP MCP, Python CLI/stdio MCP, self-hosted Supabase/Postgres schema `buffer_blaster`, Redis spend wallet and job/cache, private asset storage, Fal or configurable external gateway, ffmpeg. OpenCodeReview is an independent CLI/GitHub Actions review runner, not an integration dependency.

**Deployment fingerprint:** No confirmed live Creator Studio process, correct Buffer Blaster API URL, active workspace UUID, secrets, OIDC provider, Instinct/Paperclip IDs, renderer, actual MP4, video vault, or paid-generation authorization. Repository-level checks are **not** evidence of live deployment.

**Frontend inventory:** the Creator Studio has **one verified code-level HTML prototype** (`index.html`) with outcome entry, 3 outcome chips, local draft export, copy-for-Instinct, optional production fields and a conceptual storyboard. No live voice input, authenticated owner preview, notifications, mobile approval flow, real MP4 playback or production dashboard. Buffer Blaster's README describes routes `/`, `/studio`, `/studio/create`, `/admin`, but its browser interactions were **not tested in this audit**. Full frontend route enumeration for Buffer Blaster was not executed, and no route-count claim is made.

**Backend capability families inspected:** StarNet outcome/source/storyboard/review/plan; owner/clinical/rights/QA/operator/publisher transitions; creator sourcing/outreach/revocation; MCP; CLI; HMAC events; SQL persistence; media QA; Buffer REST/MCP/CLI canonical plan/asset lookup/UGC factory/publishing/wallet/media generation. Source paths: `districts/media/creator-studio/src/*.mjs`, Buffer `api/routers/{studio,mcp,media_receipts,assets}.py`, `api/services/{source_assets,media_contracts,media_receipts,ugc_factory,ugc_executor,studio_ledger,usage_wallet}.py`, `cli/{blaster,mcp_stdio}.py`, `docs/{AGENT_INTERFACES,AGENT_MCP_SETUP,UNIVERSAL_VIDEO_GATEWAY}.md`. Counts reflect checked families, **not** a claim of exhaustive whole-repository line review.

## 2. Product promise versus executable path

| User/business promise | Surface → transport → backend → state | Classification | Evidence |
| --- | --- | --- | --- |
| “Tell Instinct the business outcome” | Voice is the existing Instinct; StarNet agent MCP `creator_outcome_create` → loopback REST → versioned private state | **PARTIAL** | Node tests pass; no actual Instinct model-originated request |
| “Agent plans video without spending” | `creator_buffer_plan_sync` → StarNet REST → authenticated Buffer `POST /api/studio/ugc/plans` → canonical Buffer plan UUID → GET readback → StarNet receipt/projection | **BACKEND_ONLY** | Contract/mock cross-app tests pass, no live API connection |
| “Use actual licensed facility media” | independent rights officer binds an existing Buffer source UUID after workspace-scoped reference readback; StarNet retains actual rights grant/asset SHA | **DEPENDENCY_MISSING** | New Buffer PR #119 and StarNet PR #28 not merged/deployed; no verified source video upload path |
| “Create two approved videos, 30s and 15s” | StarNet approval + renderer-neutral plan → **no compatible verified Buffer output path** → verified external MP4/QA | **BROKEN (primary live flow)** | Buffer factory currently plans/generates two 10s scripts, not 30s+15s footage-based film |
| “Protect medical/customer truth” | clinician + owner + rights checks in StarNet; medspa source/source script filtering; no PHI in repo | **PARTIAL** | Code gates tested, real legal/release/identity evidence missing |
| “Agents work while owner is away” | Instinct → existing Paperclip → bounded Hermes workers → MCP/CLI; owner contact only for authenticated decisions | **DEPENDENCY_MISSING** | Paperclip runtime identity in issue #25 unresolved; live Instinct proof absent |
| “Deliver approved content” | authenticated publisher/rights/clinical/final-film gate with audit → external platform | **PARTIAL** | Adapter code, no provider account or publication evidence |
| “Measure bookings and revenue” | signed aggregate events → StarNet; Buffer Shopify/paid metrics are another source | **PARTIAL** | Synthetic signed callback tests, no verified live booking/payment reconciliation |
| “OpenCodeReview independently audits code” | Buffer PR #119 GitHub Actions → pinned reusable workflow → external LLM | **BLOCKED BY REVIEW INFRASTRUCTURE** | Actions #43372852877 **failed**, two of two selected reviews failed at provider/subtask |
| “Outcome-first human interface” | one offline HTML prototype → no real server/voice | **UI_ONLY** | Static implementation; browser/mobile/a11y interaction not run |

## 3. Canonical ownership graph

```text
CROWN & CORE tenant only
Owner (voice) → Instinct → Paperclip task → Hermes scoped worker
                      ↓ agent-only API/MCP, no raw Buffer token
            Crown & Core StarNet Studio
              ├─ outcome / storyboard revision / brand truth: authoritative
              ├─ rights, consent grants and clinical decisions: authoritative
              ├─ render authorization and final film approval: authoritative
              ├─ Buffer source UUID + Buffer plan UUID: external projection ONLY
              ├─ private SQLite + audit: proposed single-host persistence
              └─ optional publish and aggregate attribution: decisions/receipts
                        ↕ authenticated scoped bridge, explicit source UUID
           Buffer Blaster (existing workspace)
              ├─ source metadata and UGC plan: authoritative
              ├─ paid-generation wallet / provider cost: authoritative
              ├─ output assets / media receipts: authoritative when actually generated
              └─ Redis fallback is DEGRADED, not equivalent to canonical Supabase
                        ↓
           External renderer / private storage / ffprobe QA (UNVERIFIED)
```

The integration **does not** copy Buffer's Supabase database, provider key or wallet into StarNet. It writes a minimal, versioned external projection in StarNet, checks independent rights/clinical gates and enforces source-workspace equality. A new StarNet revision invalidates the projection. StarNet PR #28 is stacked on unmerged PR #26; Buffer PR #119 must land before its reference lookup can be used.

## 4. Findings ledger (ranked)

| ID | Severity / confidence | Classification & flags | Finding, evidence and prescribed closure |
| --- | --- | --- | --- |
| CC-BB-01 | **S1 / B** | `MISWIRED`, `SCHEMA_DRIFT`, `PROMISE_BLOCKED` | Buffer factory `ugc_factory.py` builds **two 10s generated first-person clips**; Crown & Core requires **30s+15s from rights-cleared authentic footage**. **Status OPEN.** Do not call paid `/ugc/factory/execute`; choose verified compatible editor/renderer and prove real files with manifest/hash/duration. |
| CC-BB-02 | **S1 / B** | `AUTH`, `STATE_FRAGMENTATION` | Buffer `GET /api/studio/references` previously read global IDs; operator key is broad. Buffer PR #119 scopes list and new exact reference read to configured workspace on Supabase/Redis. **PATCHED IN PR, UNMERGED**; independently review and verify deployed data boundary. |
| CC-BB-03 | **S1 / C** | `DEPENDENCY_MISSING`, `NO_EVIDENCE` | No actual Creator Studio–Buffer endpoint, workspace UUID, scoped secret, Paperclip identity, real asset or media job demonstrated. **OPEN** until authenticated owner-controlled live service readback and true agent-originated MCP calls. |
| CC-BB-04 | **S1 / B** | `PROMISE_BLOCKED`, `CAPACITY_LIMIT` | Buffer `POST /api/studio/references/upload` currently accepts only JPEG/PNG/WebP (up to 25MB). No verified rights-cleared **video** intake path for actual storefront footage. **OPEN**; must use approved private video vault/import path, streaming/size/resume proof before real film. |
| CC-BB-05 | **S2 / B** | `BACKEND_SURFACE_GAP`, `AUTH` | Directly exposing Buffer operator MCP to Instinct would allow access to `execute_ugc_ad_factory` (paid wallet if approved). StarNet PR #28 exposes only **two safe proxy tools** plus existing StarNet agent tools; Buffer key remains in StarNet server env. **MITIGATED IN PR**, not deployed. |
| CC-BB-06 | **S2 / B** | `FALLBACK_SEMANTIC_DRIFT`, `PERSISTENCE` | Buffer canonical Supabase plan ledger can fall back to Redis; fallback may not provide equivalent release-grade durability. Bridge intentionally requires returned `backend:supabase` and re-read of same plan. **MITIGATED IN PR**, reconcile actual workspace before deploy. |
| CC-BB-07 | **S2 / A** | `NO_EVIDENCE`, `SECURITY_FINDING_UNRESOLVED` | OpenCodeReview GH Actions run #43372852877 failed: OCR v1.13.8, two files selected, both provider/subtask requests failed. **No independent OCR verdict exists**. Require working provider config/retry or alternative independent reviewed verdict, never treat failure as pass. |
| CC-BB-08 | **S2 / B** | `PERSISTENCE`, `LOCAL_SERVICE` | StarNet `node:sqlite` on Node 22 experimental, single-writer only; production encryption, backup/restore and server restart not proven. **OPEN**, server owner approval required. |
| CC-BB-09 | **S2 / C** | `AUTH`, `NO_EVIDENCE` | OIDC MFA verifier in StarNet exists, but voice-channel authentication binding to exact video hashes, revocation, named clinician and consent release not tested live. **OPEN**. |
| CC-BB-10 | **S2 / B** | `SCHEMA_DRIFT`, `PROMISE_OVERSTATED` | Buffer plan `duration_seconds:30` and `requested_cuts_seconds:[30,15]` in metadata are **draft intent**, not generated outputs. Bridge explicitly returns `paid_generation:false`, `render_supported:false`. **MITIGATED**; no success claim without two real files. |
| CC-BB-11 | **S2 / C** | `CAPACITY_LIMIT`, `WHOLE_BODY_BUFFERING` | Buffer `AssetStorage.upload_file` uses `Path.read_bytes()` before HTTP upload; potential memory pressure for video. **OPEN**; don't reuse image upload for large video; implement verified streaming/chunked approved path. |
| CC-BB-12 | **S2 / B** | `PROMISE_OVERSTATED` | Historical Buffer audit notes Meta/TikTok campaign-container creation does not equal fully delivered ad; Shopify net refunds not fully reconciled. **OPEN/OUT OF VIDEO MVP**; do not report paid campaigns or net ROAS until real verified source. |
| CC-BB-13 | **S2 / C** | `UX_DEAD_END`, `NO_EVIDENCE` | HTML fallback only drafts JSON; no actual connected app or authenticated video review on mobile. **OPEN**; agent-first voice handoff priority; browser/a11y checks separate. |
| CC-BB-14 | **S2 / C** | `AUTH`, `NO_EVIDENCE` | Full stack audit did not access real protected production accounts or run the exact real deployment; **OPEN**. No API keys, PHI, client media, payments or live provider actions exposed. |
| CC-BB-15 | **S3 / B** | `METHOD_PATH_DRIFT` | StarNet generic renderer bridge originally assumes provider-neutral `GET health / POST jobs`; Buffer actually exposes `GET /api/health`, `POST /api/mcp`, `POST /api/studio/ugc/plans`; **FIXED FOR SAFE PLAN ONLY** in PR #28 using exact verified repository routes. |
| CC-BB-16 | **S1 / A** | `SECURITY_FINDING_UNRESOLVED`, `DEPENDENCY_MISSING` | Buffer frontend CI `npm audit --omit=dev --audit-level=high` failed with **1 critical runtime Next.js issue**: `next@16.4.0` (range includes 16.0.0–16.4.0). Advisories [GHSA-2464-fhr4-w9xw](https://github.com/advisories/GHSA-2464-fhr4-w9xw), [GHSA-p3m5-59mp-jv5r](https://github.com/advisories/GHSA-p3m5-59mp-jv5r), [GHSA-673q-mjm6-r5xr](https://github.com/advisories/GHSA-673q-mjm6-r5xr) include an unauthenticated RCE in image optimization with SVG, a Server Actions DoS, and an unauthenticated `use cache` RCE. **S1 POTENTIAL_S0_IF_EXPOSED**: actual exploitability depends on deployed routes and is not verified. CI recommends `next@16.4.6`, outside declared range. **OPEN BLOCKER**: perform isolated exact dependency/lock upgrade, regression and security re-audit; do not run blind `npm audit fix --force`. |

**Severity totals:** 5 S1; 10 S2; 1 S3. No S0 finding is asserted without observed external exploitability. Findings are based on code/CI/live Actions job logs, not on a full production penetration test.

## 5. Authentication, approvals, failure states and capacity

- **Agent:** only Crown StarNet agent token. StarNet's MCP bridge exposes 11 agent-only tools after PR #28. No generic MCP forwarding to Buffer; only safe Buffer status and zero-spend plan sync.
- **Rights:** separate rights role binds a verified Buffer workspace asset UUID only after the StarNet rights grant, owner approval, clinician screening and source hash check; reference membership alone is explicitly not consent.
- **Clinical:** independent screening is mandatory before any medspa **render**, including claim-free; the LLM's flag is not a clinician.
- **Owner:** final film approval binds exact QA MP4 hashes; publication is separately authorized. Voice text alone isn't an authenticated approval.
- **Budget:** Buffer owns its wallet; StarNet owns the render cost cap. PR #28 calls **only no-spend planning** and does not transmit wallet IDs or `approved:true`.
- **Retry:** Buffer draft idempotency key deterministic from StarNet outcome/version/rights/source and readback verified. Race conditions across services still require integration tests; no automatic retry of a billable ambiguous job.
- **Data:** no patient names, treatment records, faces or contact details stored in public GitHub. Test fixtures are synthetic. Material release/rights documents belong in private vault.
- **Transport:** configured Buffer URL must be HTTPS (or loopback HTTP) with no credentials in URL/redirects; provider key only server-side. Buffer's existing CLI Python uses network access and is not directly registered into Instinct, preventing a bypass.
- **Capacity:** Buffer image uploads only, 25MB; large real video intake unproven. Prove source ingestion, checksums, memory bounds, expiry and streaming before release.

## 6. Automated verification and runtime honesty

| Check | Status / evidence |
| --- | --- |
| StarNet Creator Studio stacked PR #28 | **50/50 Node tests passed**: [Actions #43372857818](https://github.com/executiveusa/crownandcorestarnet/actions/runs/43372857818); mocks verify authenticated transport shapes and fail-closed gates |
| Buffer PR #119 Python API test job | **PASS** (job 131712426502 in [Actions #43372852531](https://github.com/executiveusa/buffer-blaster-/actions/runs/43372852531)) |
| Buffer #119 Python, Postgres and container jobs | **PASS** in run #43372852531 (at initial PR head) |
| Buffer #119 frontend security + build | **FAIL** at `npm audit --omit=dev --audit-level=high`: Next.js critical runtime advisory. Build/lint/route checks after the failed audit were not reached. Exact newer-head CI still must be checked. |
| OpenCodeReview #119 | **FAILED**: [Actions #43372852877](https://github.com/executiveusa/buffer-blaster-/actions/runs/43372852877), two selected files failed due LLM provider/subtask; no findings verdict |
| OpenCodeReview #28 | **FAILED**: [Actions #43373991999](https://github.com/executiveusa/crownandcorestarnet/actions/runs/43373991999): all 12 selected file reviews failed with GitHub Models non-JSON `text/plain` response. Pinned tool installed, provider response incompatible; no independent OCR verdict. |
| Codex PR reviews | Both initial PRs received review comments. Three actionable findings: amended exact creative/rights plan readback, revision race recheck, and progressive Redis workspace list scan. Fixes committed on PR #28/#119 with new regression tests; fresh head review needed. |
| StarNet complete `npm run verify` on stacked PR #28 | Not independently run as part of that stacked PR at report preparation; prior PR #26 passed |
| Browser/mobile UX interaction | NOT RUN |
| Real Instinct/Paperclip tool call | NOT RUN (blocked #25) |
| Real Buffer Blaster authenticated endpoint / workspace | NOT RUN (no confirmed live credentials) |
| Real 30s + 15s MP4, video QA, delivery | NOT RUN (provider contract mismatch and media intake gap) |
| Paid provider generation/publishing/contact | NOT RUN BY POLICY; zero spend |

## 7. Roadmap and release gates

1. **Code-review and merge order:** independently resolve the critical `next@16.4.0` production security audit, obtain review + all CI for Buffer #119 **first** (workspace reference scope), then PR #26 (base Creator Studio), then stacked PR #28 (integration; retarget to `main` or rebase after #26 merges). Do not merge without owner sign-off.
2. **Server-only wiring:** discover the existing Paperclip/Instinct tenant (issue #25), private Crown API and Buffer API; set `CROWN_BUFFER_API_URL`, `CROWN_BUFFER_API_KEY`, `CROWN_BUFFER_WORKSPACE_ID` in **server secret store**, not in MCP client prompts. Prove Buffer `/api/health`, `/api/studio/status`, authenticated MCP tool list.
3. **Safe pilot:** rights officer reads exact Buffer workspace source UUID, StarNet verifies grant/asset hash + clinical, agent calls `creator_buffer_plan_sync`, Buffer creates zero-spend canonical plan and StarNet immediately reads it back; assert same UUID and no provider job/wallet/spend.
4. **Real production adapter:** identify an existing supported Motion Master/Montage/Buffer editorial pathway that can ingest real licensed video and output **two distinct verified** 30s/15s H.264 1080×1920 MP4s; if absent, implement a separate reviewed provider bridge under owner control. **Do not use Buffer's 10s+10s synthetic UGC factory as a substitute.**
5. **Release:** private vault, owner MFA voice/mobile review, film hash approval, clinician/legal checks and rollback, no publication unless separately approved. Only then directly verify deployment and business outcome with actual receipts.

## 8. Commercial impact, decision and rollback

**Commercial slice:** a real, licensed Crown & Core “One place” 30s+15s brand film that leads to an attributable booking inquiry. The current code can generate an auditable *production plan* for that work **without spend**. It cannot yet deliver or publish a verified film; revenue is **unknown**, not zero and not simulated.

**Decision:** **PARK automatic paid generation** until editorial-render contract is verified. **USE** Buffer's existing UGC plan/ledger and safe MCP/CLI interfaces; **MERGE** only reviewed workspace-isolation and bridge PRs in dependency order. **SELL** only completed verified creative, not non-existent production capability.

**Rollback:** close PR #28 and PR #119 before merge; if staged, remove server `CROWN_BUFFER_*` integration vars and revoke scoped operator key, disable StarNet bridge routes/MCP registration, revert code and preserve audit records. Never delete or relabel published media without actual platform receipt. Stop any operator-side effect before reverting state.

**Next action:** Instinct server operator executes updated issue #27, read-only first. Required human approvals: repo reviews/merge, Crown Buffer workspace/prod secrets, rights/clinical approvers, and capped real-video smoke. No owner action is needed for no-spend mock tests.


## 9. Independent review findings and follow-up

**Codex review against PR #28 head `c94fd53`:** the original Buffer plan matcher compared only idempotency/source/version but not `script`, `shot_plan`, `finish_mode` or approved rights refs, permitting a returned unapproved first-person script to be accepted. The replay branch did not recheck current creative revision after an awaited provider read, permitting a stale success receipt. Both are **FIXED IN PR** by canonical full creative/rights metadata equality and post-await state/plan identity revalidation; tests now mutate script, shot, finish mode, rights, and creative revision during in-flight async reads.

**Codex review against Buffer PR #119 head `329bdd6`:** the global Redis sorted set was filtered only *after* an upfront `zrevrange(..., limit-1)` page, causing newer foreign-workspace assets to crowd out valid older references. **FIXED IN PR** with paginated scanning until the requested number of matching workspace entries, plus regression tests covering 50 foreign records preceding valid source media.

**Independent review gate remains OPEN:** both PRs' OpenCodeReview GH Actions runs failed due to the LLM provider; a Codex suggestion is a finding, not final independent approval. Re-run OCR when its provider works or obtain a separate qualified security/code review of the exact new head. Do not merge on passing unit tests alone.

**Security priority:** the independent frontend npm audit found a critical Next.js production dependency affecting Buffer. This is a separate pre-existing security issue, not caused by source-reference patches, but is a **release gate** for using Buffer's live frontend or claiming production-ready full-stack wiring.
