# Crown & Core knowledge system - Phase A baseline

**Recorded:** 2026-11-05 (America/Mexico_City) by the existing Instinct agent, executing the owner-supplied handoff `CROWN_CORE_INSTINCT_PRODUCTION_HANDOFF_2026-11-05.md`.
**Scope:** read-only inspection plus isolated nonproduction test of PR #24. No external system was modified. No secrets were read or printed; vault presence was checked by entry name only.

## 1. Repository baseline (verified live 2026-11-05)

| Fact | Value | Proof |
|---|---|---|
| Canonical repo | `executiveusa/crownandcorestarnet`, PUBLIC | GitHub API `private:false` |
| main HEAD | `667b1a17fa3ce0f946f14911605535df687f0403` | matches handoff baseline |
| PR #24 | open, DRAFT, head `6d2647c93a80f82b514457f38c61c8fde3fc845d`, base `667b1a1` | GitHub API |
| CI on exact head | run 41981682618 SUCCESS; jobs `verify` and `docker-computers` SUCCESS | GitHub Actions API, created 2026-11-05T06:37:43Z |
| Other open PRs | none | GitHub API (PRs 5-23 closed unmerged or merged historically) |
| Related repos | `executiveusa/paperclip-pauli-clip` (public fork, last updated 2026-08-08); `executiveusa/executiveusa-crown-core-growth-system` (PRIVATE, updated 2026-10-12); `executiveusa/crown-and-core` (flipbook, locked read-only by owner 2026-10-04) | GitHub API + owner instruction |

Local re-verification on an isolated checkout at the exact PR SHA (Node v22.23.4):

- `npm run knowledge:test` - 12 pass / 0 fail (`knowledge-interface` + `paperclip-preflight` suites).
- `npm run knowledge:list|search|get` - working, with SHA-256 source digests.
- `npm run verify` - full suite PASS, exit 0 ("All Crown & Core StarNet verification tests passed").
- Docker proofs (`runtime:prove:docker`, `runtime:mission:docker`, `runtime:mission:phased:docker`) - NOT run locally (no Docker in the test sandbox); covered by CI `docker-computers` job on the exact SHA. These are isolated fixture proofs, not live-data proof.
- MCP stdio server: protocol-level proof only. An agent-authored harness piped real JSON-RPC `initialize`, `tools/list` and `tools/call` messages to `mcp-stdio.mjs` on the local checkout; all three tools (`crown_knowledge_list/search/get`) responded correctly with source digests. This is NOT runtime-discovered MCP tool use by a model and NOT registration in any supported agent runtime.

## 2. Paperclip instance discovery - BLOCKED, no live server found

| Lead | Result (2026-11-05) |
|---|---|
| Historical self-hosted Paperclip endpoint on the old owner-controlled host (address withheld from public repo) | `GET /api/health` connection timed out (independent re-probe today); PR #24 recorded refused on 2026-11-05 earlier check |
| Old host containers/systemd (desk read-only inventory 2026-11-05) | No Paperclip process or container. A flipbook preview container and Command Center services are unrelated to Crown & Core knowledge. One private code/config path lead only (path withheld), no running server proof |
| Second owner-controlled host (address withheld; desk read-only inventory) | No Paperclip/Crown/starnet-cc name matches in systemd/container/opt shallow check (limited negative, not proof of absence) |
| Kupuri Paperclip deployment attempt 2026-11-03 | Blocked on low free disk on the old host; never deployed. That effort was Kupuri-scoped, not Crown & Core |
| Existing company ID / project ID / Instinct agent ID / API key | NOT verified anywhere. Not in repo (by design), not in memory, not in vault (name-level check) |
| `.paperclip/README.md` reference to "existing Lethia/Instinct (Alex) agent" | Unverified claim in repo documentation. No authenticated Lethia-controlled agent identity has been established. Do not conflate with unrelated past task agents |

**Gate effect:** `npm run paperclip:preflight` cannot be run for real; there is no verified server URL, credential, company, project or agent ID to point it at. Creating any of these is explicitly out of scope (no new company/agent/scheduler).

## 3. Private Crown & Core data source - BLOCKED, correct database unidentified

- The connected Supabase cloud account shows only an unrelated project belonging to a different business (identity withheld from this public repo). Per the handoff, it is never read or written for Crown & Core. Untouched.
- The private credential store holds one entry whose name suggests a Crown & Core private review on the old host (entry name withheld here). What it unlocks is unverified; it is not evidence of a business database.
- No consented, owner-identified Crown & Core private database/vault is established. Square read access remains parked pending Lethia's agreement (standing owner rule).

## 4. Source inventory delta

The branch's `knowledge/SOURCE_REGISTER.md` and `_system/knowledge/catalog.json` (27 allowlisted sources) were verified complete against the repo tree. Delta and flags:

- The restricted `Crown_Core_90_Day_Agreement_..._v3.docx` remains a private Library document; signed status unverified; not ingested (correct).
- Historical creative ZIPs/media remain unreconciled; flagged unavailable, not ingested (correct).
- `_shared/state/current-state.json` metrics remain `null` except dated 2026-09-28 booking-destination/catalog booleans; no metric was promoted without authenticated evidence (correct).
- Growth repo `feat/tshape2-research-and-import` content remains un-imported (correct; clinical/legal gate).

## 5. Instinct-runtime MCP registration - PARTIAL, platform gate named precisely

- ACHIEVED (protocol level): agent-authored scripted JSON-RPC exchanges against `mcp-stdio.mjs` on a local checkout at the exact PR SHA, plus 25 scripted evaluation probes with expected-behavior output checks (`_system/references/HANDOFF_EVAL_2026-11-05.md`). These are isolated protocol/output proofs, not model-originated tool calls.
- NOT ACHIEVED: registration of `mcp-stdio.mjs` in Instinct's platform-supported persistent MCP configuration, and no runtime-discovered, model-originated MCP tool calls. The platform tool configuration is not a user- or agent-modifiable surface and there is no supported self-registration action: an unsupported-platform-capability gate, not a credential failure. All receipts here used direct scripted stdio invocation instead.
- NOT ACHIEVED: Paperclip-hosted registration (no server, see section 2).

## 6. Risk ledger

| Risk | State | Mitigation in place |
|---|---|---|
| Repo is PUBLIC | Confirmed | Only public-safe sources committed; restricted docs are metadata pointers only; verified today |
| Secret leakage | None found | No tokens in repo; preflight never prints bodies/keys (tested); vault untouched by this work |
| Cross-tenant (Tangles & Locs) contamination | No T&L data in allowlist | Tenant boundary documented in `knowledge/ACCESS_AND_APPROVALS.md`; cross-tenant queries return only public C&C sources |
| Prompt injection via knowledge content | Tested | Injection-style queries are treated as inert keywords; MCP never executes content; allowlist-only retrieval |
| Arbitrary file access | Tested | Path traversal and unregistered IDs return `UNKNOWN_SOURCE`; catalog allowlist enforced |
| Invented metrics | Guarded | `current-state.json` nulls preserved; eval requires explicit UNKNOWN/NOT_CONNECTED answers |
| Second scheduler / duplicate company | Avoided | Historical StarNet runtime NOT activated; no Paperclip mutations attempted |
| Unreviewed merge | Held | PR #24 stays DRAFT; no merge authority exercised |
| Lethia impersonation | Refused by design | No authenticated Lethia session exists; all Lethia-facing tests blocked until her own verified access |

## 7. Gate status (handoff section 8)

| Gate | Status | Evidence / blocker |
|---|---|---|
| G1 Repo | PASS (pre-review) | CI green on exact SHA; local re-verify PASS. Independent review still required |
| G2 Paperclip | BLOCKED | No verified server/company/project/agent (section 2) |
| G3 Instinct MCP | NOT PROVEN | Protocol-level stdio proof only; runtime registration and model-originated MCP calls unsupported in this platform (section 5) |
| G4 Private data | BLOCKED | Correct C&C database unidentified; unrelated Supabase off-limits (section 3) |
| G5 Quality | PARTIAL | 25 scripted probes + negative output checks executed locally; model-originated and Lethia-authenticated runs blocked |
| G6 Operations | BLOCKED | No Paperclip runtime; no scheduler changes made |
| G7 Authority | BLOCKED | No Lethia/clinical/owner approvals recorded |
| G8 Release | BLOCKED | No merge, no deploy, no rollback event |

**Decision: BLOCKED for production; the repo knowledge layer is STAGING-ONLY verified at `6d2647c93a80f82b514457f38c61c8fde3fc845d`.**
