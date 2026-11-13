# Crown & Core Creator Studio — agent-first video production

**Standalone Crown & Core product within StarNet.** PR #26, not merged or deployed. No MACS, BufferBlaster, new editor or duplicate Paperclip.

The owner tells Instinct the outcome; agents use nine MCP tools and a role-separated REST API to coordinate a truthful creator campaign, approved footage, storyboard, capped rendering, independent 30s+15s MP4 QA, final-film review and optionally separately authorized organic publication. A creator shortlist/outreach workflow is available but never contacts anyone without explicit permission and owner approval. No paid Meta ad execution is implemented.

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

The API binds `127.0.0.1:8787`. The stdio MCP adapter exposes **nine agent-only tools**; it cannot approve, contact, render, publish or spend. For owner/clinical production identity, configure pinned OIDC MFA JWT verification as described in `OPERATIONS.md`; do not expose proof bearer tokens to browsers or agents.

## Implemented code vs live proof

| Component | Code-side state | Real connection |
| --- | --- | --- |
| Outcome-first mobile fallback | Offline interactive design preview | Instinct voice UI pending |
| REST and MCP | 9 agent tools + role-separated stage API | Live Instinct/Paperclip pending |
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
