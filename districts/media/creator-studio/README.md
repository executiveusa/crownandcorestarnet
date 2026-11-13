# Crown & Core Creator Studio

**Outcome-first, agent-first video campaign product inside StarNet.** Draft PR #26; not merged or deployed. No dependency on MACS or BufferBlaster.

## Start here

- [PRD](./PRD.md) — owner jobs, MVP, compliance and acceptance.
- [Architecture](./ARCHITECTURE.md) — Instinct → Paperclip → bounded Hermes → StarNet API/MCP → external renderer, trust boundaries.
- [Wireframes](./WIREFRAMES.md) — low-text mobile ASK / MAKING / REVIEW / RESULT and voice interactions.
- [Instinct server handoff](./INSTINCT_HANDOFF.md) — exact proof and release gates.
- [Product boundary](./PRODUCT.md) — original MVP decision and commercial-renderer contract.

## Try the design

Open `index.html` locally in a browser. It is a **no-network, no-microphone** interactive design prototype: state an outcome, select a suggested goal, view the storyboard concept, copy a request for the existing Instinct channel or download a draft JSON. It does not call an agent, render a video, store customer data, or grant approval.

## Test the backend

Node.js **22** required; no npm install/dependencies.

```bash
node --test districts/media/creator-studio/tests/*.test.mjs
node --check districts/media/creator-studio/src/domain.mjs
node --check districts/media/creator-studio/src/api.mjs
node --check districts/media/creator-studio/src/mcp.mjs
```

The dedicated GitHub Actions workflow `.github/workflows/creator-studio.yml` runs these tests for the PR. Existing StarNet `npm run verify` also runs independently.

## Local API proof (not public hosting)

```bash
# Load distinct 24+ character tokens from a private secrets manager.
export CREATOR_STUDIO_AGENT_TOKEN="<local-agent-token>"
export CREATOR_STUDIO_OWNER_TOKEN="<different-local-owner-token>"
node districts/media/creator-studio/src/api.mjs
```

Defaults: `http://127.0.0.1:8787`, **memory-only**. Optional `CREATOR_STUDIO_STATE_FILE` must be an absolute path outside the repo and is local JSON, not a production database. `GET /health` shows the proof boundary. The API requires bearer authentication for every `/v1` route. The optional `CREATOR_STUDIO_CLINICAL_TOKEN` must be distinct and is for local clinical-role proof only.

In a separate process (same trusted host), set **only the agent token** and run:

```bash
node districts/media/creator-studio/src/mcp.mjs
```

The stdio MCP bridge exposes seven agent-only tools and calls the loopback API. It deliberately has no approve, publish, spend, render-execute or outreach tool. For registration and live agent-originated proof, see `INSTINCT_HANDOFF.md`.

## Current status

| Surface | State |
| --- | --- |
| Voice-first owner flow | Designed; Instinct runtime not connected |
| Interactive minimal UI | Local design prototype |
| Agent API and MCP | Local proof implementation |
| Rights/storyboard/approval state machine | Local proof implementation and tests |
| Hermes/Paperclip orchestration | Proposed, existing runtime not verified |
| Motion Master/Montage | External renderer contract only, no live adapter |
| Private rights vault / tenant DB | Not connected |
| Video MP4, posting, ads, conversion | Not implemented or claimed |

**Proof ≠ production.** Do not merge/deploy without independent review, owner approval, authenticated server/tenant evidence and a direct staging run. Rollback: stop proof processes, revoke local tokens, close/revert the PR.
