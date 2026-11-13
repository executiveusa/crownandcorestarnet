# Crown & Core Creator Studio — agent-first video production

**Standalone Crown & Core product within StarNet.** PR #26, not merged or deployed. Independent from MACS and Buffer Blaster business ownership; reuses the existing Buffer Blaster engine by a constrained API/MCP/CLI adapter, without sharing customer identities, secrets or databases.

The owner tells Instinct the outcome; agents use eleven MCP tools and a role-separated REST API to coordinate a truthful creator campaign, approved footage, storyboard, capped rendering, independent 30s+15s MP4 QA, final-film review and optionally separately authorized organic publication. A creator shortlist/outreach workflow is available but never contacts anyone without explicit permission and owner approval. No paid Meta ad execution is implemented. Buffer Blaster integration is no-spend planning only until a compliant 30s+15s source-video renderer is proved.

## Start here

- [PRD](./PRD.md) — outcomes, requirements, non-goals and acceptance.
- [Architecture](./ARCHITECTURE.md) — trust boundaries, orchestration and state machine.
- [Wireframes](./WIREFRAMES.md) — mobile ASK/MAKING/REVIEW/RESULT and voice design.
- [Operations](./OPERATIONS.md) — **authoritative code-side integration, exact provider bridge contract, environment variables, security and rollback**.
- [Instinct server handoff](./INSTINCT_HANDOFF.md) — owner-controlled deployment and model-originated acceptance.
- [Machine-readable API](./openapi.yaml) — local API routes and production-stage extensions.
- [Product contract](./PRODUCT.md) and [canonical media contract](../references/COMMERCIAL_STUDIO_CONTRACT.md).

## Try the owner experience

Open `index.html` in a browser: an **offline no-network design preview**. It accepts a business outcome, offers suggestions, shows a concept storyboard and exports a local unapproved JSON brief or copies a prompt for the existing Instinct channel. This is not a connected voice client or a rendered video.

## Run the complete code-side test suite

Node.js **22.23+**; no npm install required. Node 22's built-in `node:sqlite` remains experimental.

```bash
node --test districts/media/creator-studio/tests/*.test.mjs
npm run verify
```

Dedicated GitHub Actions `.github/workflows/creator-studio.yml` runs syntax and integration-contract tests on every PR change.

## Run a private local proof

```bash
# Inject distinct private 24+ character role credentials, never check them in.
export CREATOR_STUDIO_AGENT_TOKEN="<agent-only>"
export CREATOR_STUDIO_OWNER_TOKEN="<different-owner-proof-only>"
# Optional durable single-host state, on a private encrypted volume outside repo:
# export CREATOR_STUDIO_DB_FILE="/var/lib/crown-core/creator-studio/studio.sqlite"
node districts/media/creator-studio/src/api.mjs
```

In a second trusted process with **only the agent token**:

```bash
node districts/media/creator-studio/src/mcp.mjs
```

The API binds `127.0.0.1:8787`. **Never inherit owner, clinical, rights, operator or publisher tokens in the MCP process.** The stdio MCP adapter exposes **eleven agent-only tools**; it cannot approve, contact, render, publish or spend. For owner/clinical production identity, configure pinned OIDC MFA JWT verification as described in `OPERATIONS.md`; do not expose proof bearer tokens to browsers or agents.

## Implemented code vs live proof

| Component | Code-side state | Real connection |
| --- | --- | --- |
| Outcome-first mobile fallback | Offline interactive design preview | Instinct voice UI pending |
| REST and MCP | 11 agent tools + role-separated stage API | Live Instinct/Paperclip pending |
| Creator sourcing and outreach | Draft, exact-message approval, reservation, private adapter | Contact provider pending, sending disabled |
| Rights and clinical review | Exact-version gates, grant hashes, revocation/takedown | Real release vault and reviewers pending |
| Persistence | Transactional private single-host SQLite and audit receipts | Owner-controlled encrypted volume pending |
| Reviewer identity | Pinned OIDC RS256 MFA JWT verifier | IdP configuration pending |
| Renderer | Authenticated exact-endpoint adapter, capped job reservation, signed callback | Actual Motion Master/Montage deployment pending |
| QA | Private-file ffprobe H.264 1080×1920 30s+15s SHA-256 verification | Real exported MP4 pending |
| Final film and organic publication | Exact-hash owner approval, separate post authorization, reserved outbound adapter | Platform permissions and owner approval pending |
| Attribution | Signed callback, event dedupe and aggregate metrics | Real booking/payment data source pending |
| Paid advertising | Not implemented | Not authorized |

**No production, customer contact, video generation, publication, bookings or spend is claimed.** All external side effects are disabled unless a trusted operator explicitly configures and invokes the corresponding worker. No owner/clinical approval tool is exposed to Instinct.

## Rollback

Before merge: close PR #26. After approved merge: disable outbound workers, stop API/MCP, revoke tokens, revert the merge and preserve private audit evidence. Rights revocation of already published content requires a separately verified takedown receipt.

## Buffer Blaster integration — staged, no spending

Actual source engine: [`executiveusa/buffer-blaster-`](https://github.com/executiveusa/buffer-blaster-) (trailing hyphen). [PR #119](https://github.com/executiveusa/buffer-blaster-/pull/119) adds workspace-filtered reference lookups; [stacked Creator Studio PR #28](https://github.com/executiveusa/crownandcorestarnet/pull/28) adds the bridge on top of PR #26. No live server is configured.

- Server-only, secret-injected: `CROWN_BUFFER_API_URL` (HTTPS Buffer API origin), `CROWN_BUFFER_API_KEY` (Buffer operator credential **never passed to Instinct**), `CROWN_BUFFER_WORKSPACE_ID` (exact verified UUID).
- Agent MCP: `creator_buffer_status` and `creator_buffer_plan_sync` are safe. Generic Buffer `tools/call` and paid execution are **not** exposed.
- Rights operator: independently verify release and source hash, then `node districts/media/creator-studio/src/buffer-cli.mjs bind <outcome-id> <revision> <buffer-source-uuid>`.
- Safe agent: `node districts/media/creator-studio/src/buffer-cli.mjs status`, `tools`, and `plan <outcome-id>` using only the StarNet agent token. These call StarNet's loopback API, which verifies Buffer's real REST/MCP endpoints and canonical no-spend plan readback.
- **Stop before video generation:** Buffer's existing paid UGC factory produces two 10s AI scripted clips, not the required **genuine footage-based 30s + 15s** exports. A plan is **not** a video or a spending authorization. See [full-stack wiring audit](./FULL_STACK_WIRING_AUDIT_2026-11-12.md) and [operations](./OPERATIONS.md).

**Test proof:** 50/50 Node tests passed for stacked PR #28 at [Actions #43372857818](https://github.com/executiveusa/crownandcorestarnet/actions/runs/43372857818). Provider interactions were mock responses; no live video, publishing or spending was executed.
