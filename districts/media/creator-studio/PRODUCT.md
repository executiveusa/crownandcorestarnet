# Crown & Core Creator Studio — standalone product inside StarNet

Status: **P0 local-proof API/MCP + outcome-first UI; no live connectors / no render claim**. Owner: Crown & Core. Product classification: **USE** (client-specific owned capability). Current workstream: bounded media experiment, not a fourth running controller.

## Decision
The Creator Studio belongs in `executiveusa/crownandcorestarnet` under `districts/media/creator-studio/`. It is a standalone **Crown & Core application surface**, not a separate repository, not BufferBlaster, not MACS, and not a duplicate StarNet scheduler. Its business objects use StarNet's existing policies and approval/receipt contracts. It does not import Tangles & Locs data.

## Validated existing constraints
- Read `../CONTEXT.md`, `../references/COMMERCIAL_STUDIO_CONTRACT.md`, `../../../_shared/policy/HEART_AND_SOUL.md`. Canonical paths are relative to this directory.
- StarNet owns campaign briefs, audience/service selection, approved claim references, media provenance, creator rights, cost caps, human review, job routing and immutable receipts.
- Motion Master and Montage are **candidate external production/rendering providers**. Their live runtime/API compatibility has NOT been verified. No embedded video-render engine is required for this MVP.
- Instinct/Paperclip connection remains a separate unverified gate (PR #24 and issue #25); a working static prototype does not prove live agent dispatch.
- Founder-led does not require making the founder an influencer. First-party footage, staff expertise and permitted creator partnerships are valid.
- Synthetic creator videos may be permitted when honestly labeled, with no fabricated customers, outcomes, clinician endorsements, or health claims.

## Interface modules
1. **Campaign desk**: draft offer angle, service, placement, audience, KPI and booking destination.
2. **Creator & rights ledger**: source creator/asset ID, license, release scope, expiration, brand authorization, synthetic disclosure.
3. **Storyboards**: 15/30/60-second outlines, hooks, on-screen text, shot sources and claim references; no invented testimonial.
4. **Production jobs**: versioned job spec with renderer adapter, idempotency key, budget ceiling, run receipt, external export ref.
5. **Human review**: owner approval, clinical/legal approval when necessary, publication approval per exact version.
6. **Measurement**: source-tagged landing/booking events, completed bookings and attributable revenue when connected; unknown stays null.
7. **Campaign insights**: planned/approved/produced/published/verified states; do not confuse video view counts with booked revenue.

## P0 boundary — first independently testable slice
- A responsive, no-network outcome-first design prototype at `index.html` accepts one sentence, suggested goals, optional source refs and exports an explicitly **unapproved** JSON draft even when rights are missing. Missing evidence is flagged, not silently asserted.
- A Node 22 local proof REST API and seven agent-only MCP tools are implemented in `src/`, with a versioned state machine, owner/clinical role separation, rights/claims/disclosure gates and non-executing 30s+15s render plan.
- `tests/studio.test.mjs` and a dedicated CI workflow exercise authorization, tenant separation, stale decisions, synthetic testimonial blocking, idempotency and no-dispatch.
- No customer data, live Instinct calls, external provider rendering, paid spend, publishing or bookings are performed. Real voice approvals and production private storage are not implemented.
- Full details: [PRD](./PRD.md), [Architecture](./ARCHITECTURE.md), [Wireframes](./WIREFRAMES.md), [Instinct Handoff](./INSTINCT_HANDOFF.md).

## API boundary
The local API is **loopback-only** and must not be exposed publicly. It supports agent draft creation/source/storyboard/review and owner/clinical exact-version approval with separate bearer roles. Render planning is not render execution. Production endpoints and provider integration are proposed in `ARCHITECTURE.md`, not deployed.

## Studio workflow
IDEA -> SOURCE+RIGHTS -> STORYBOARD -> DRAFT BRIEF -> OWNER REVIEW -> RENDER JOB (only after approved adapter) -> EXPORT/QA -> HUMAN APPROVAL -> PUBLICATION (separate authorization) -> ATTRIBUTION.

### Pilot and acceptance
Pilot: one truthful, rights-cleared Crown & Core brand film/creator cut, ideally the existing "One place" film (30s + 15s) where source footage and permission exist. First metric: one validated brief exported and reviewed; later one verified playable MP4 with rights and render receipts. Campaign outcome must be measured by qualified inquiries/appointments, not likes.

### Release gates
1. Independent code/privacy/clinical claims review.
2. Owner verifies the creative/art direction and rights.
3. Correct Crown & Core authorization and isolated private media vault.
4. Real renderer endpoint/auth/version check and synthetic smoke receipt before paid processing.
5. Owner approval before any deployment, external media processing, posting, ad spend, or booking-related changes.
6. Rollback: close PR for this draft; if merged later, revert the commit and disable external routing.

## Conflicts and boundaries
Do not recreate the sound editor: the 2026-10-24 `COMMERCIAL_STUDIO_CONTRACT.md` prohibits this in the current milestone. Keep media rendering external. Do not merge this branch with the unreviewed knowledge integration PR #24. After PR #24 is independently reviewed/merged, rebase this feature branch and revalidate paths and tests.
