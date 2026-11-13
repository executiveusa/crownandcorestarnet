# Crown & Core Creator Studio — Product Requirements (v0.2)

**Status:** implementation candidate in draft PR #26; not deployed. **Owner:** Crown & Core. **Product:** standalone Crown & Core experience within the existing StarNet repository, not a new company-wide SaaS, not MACS, not BufferBlaster.

## 1. Decision and outcome

The owner tells her existing Instinct agent an outcome, e.g. **“Make a trustworthy 30-second video that brings qualified consultations to Crown & Core.”** Instinct handles the conversation, creates a machine-readable outcome, and delegates work to the **existing Paperclip instance** when its identity/runtime is authenticated. Hermes may coordinate bounded creative specialists *inside a Paperclip job*; Hermes must not start a second persistent scheduler, spawn unapproved networked bots, or acquire publishing/spend authority.

The system must be **API/MCP-first** and **voice/mobile-approval-first**. The owner should not need a laptop or dashboard for normal operation. A single-purpose, low-text review surface exists for exceptional decisions and accessibility fallback.

**Commercial objective:** one genuine rights-cleared “One place” 30-second vertical film plus a 15-second cut, with verified provenance, human approval, a real exported MP4, and a measurable booking-intent path. If campaign traffic is later authorized, measure qualified inquiries, completed bookings, and attributable revenue with source-backed events; no invented conversions.

## 2. User jobs, not modules

| Spoken outcome | System responsibility | Human interruption |
| --- | --- | --- |
| “Create a video for people new to Crown & Core.” | Interpret objective, retrieve verified services/brand truth, propose angle, select authorized footage, prepare two cutdowns, QA | Approve exact finished film; approve brand-defining creative |
| “Use a local creator to explain what visiting feels like.” | Shortlist only legitimately sourced creators, check contact permission and rights, draft offer, collect release | Approve outreach before any creator/customer contact, approve usage terms |
| “Make this video warmer.” | Change the requested revision, preserve provenance, request re-render through verified provider | Review materially changed final creative |
| “Show what it produced.” | Return one playable verified asset and concise receipt, or state exactly what is blocked | None if informational |
| “Get more bookings from this.” | Verify mobile booking, attribution, lead response, compliance and spend budget before drafting campaign | Explicit campaign-specific publication and paid-media authorization |
| “What worked?” | Reconcile campaign tracking and actual booking/payment receipts | None for approved aggregate reporting |

### Success measures
- **Experience:** first request can be created by one spoken sentence and returned as a concise status without opening a form.
- **MVP proof:** an agent-originated API/MCP request creates a draft and can query its status; an owner (separate authenticated role) can approve a specific version; unapproved or mismatched requests fail closed.
- **Creative proof:** one 30s + 15s **playable, verified** external render using licensed/owner-owned media, with provider IDs, asset hashes and QA receipt. Not yet implemented.
- **Commercial proof:** attribution event from an authorized live source, then qualified inquiry/booking/payment when available; until then metrics remain **unknown**, never sample values represented as real.
- **Operations:** no external render, posting, spend, booking changes or customer outreach without distinct required authorization.

## 3. Primary experience

**No default dashboard.** Instinct is the front door; the owner gets (1) outcome acknowledgement, (2) at most one clarifying question if essential, (3) a short review request with visual preview when ready, (4) verified result. Agents use the API/MCP without opening a browser. Voice transcripts are instructions, **not authenticated approvals** unless the voice channel independently proves the approver identity and binds the decision to the exact asset/version and action.

Fallback UI has three states: **Ask**, **Making**, **Review**. The review state shows a large playable preview (only when real), one-sentence outcome, evidence summary and **Approve / Change**. No empty metrics, charts or raw internal tasks. Advanced rights/claims/versions are collapsible.

## 4. Functional requirements

| ID | Requirement | Phase | Acceptance |
| --- | --- | --- | --- |
| F01 | Outcome-first request creates an ID, version, explicit no-execution state | P0 | API and MCP smoke test |
| F02 | Asset/source refs and rights evidence are required before review | P0 | Missing evidence rejected |
| F03 | Agent can submit a storyboard, not fabricate testimonials or approvals | P0 | Synthetic testimonial test blocked |
| F04 | Owner/clinical decisions require separate role and exact version | P0 | Agent cannot approve; stale approval denied |
| F05 | Agent prepares a provider-neutral 30s/15s render plan only after approval | P0 | Plan cannot execute or spend |
| F06 | Persistent private store, tenant auth and independent audit storage | P1 | Read/write tenant isolation and restart proof |
| F07 | Real Motion Master/Montage adapter with health, job, export, hash and QA receipts | P1 | One nonclinical synthetic smoke, then one approved film |
| F08 | Instinct MCP connection and Paperclip task assignment | P1 | Model-originated tool-call receipt and existing agent IDs |
| F09 | Hermes specialist execution within one bounded task | P1 | Task graph, budgets, timeouts, no unauthorized subagents |
| F10 | Asynchronous signed owner/clinical approvals via authenticated mobile/voice channel | P1 | Identity, exact version, action, expiry, replay protection |
| F11 | Creator sourcing, opt-in outreach, license terms and revocation | P2 | Contact authorization and revocation denial tests |
| F12 | Separate publish/paid-ad integration, conversion and reporting | P2 | Mobile booking, spend cap, attribution, platform permissions |

**P0 delivered in this PR:** local proof API/MCP, domain gates, low-text wireframe and tests. **Not delivered:** real Instinct runtime, model-generated video, external adapters, production approvals, private storage or publishing.

## 5. Source and legal boundaries

- No fake reviews, invented customer experiences, fabricated patient results, invented medical authority or disguised synthetic testimonials.
- The FTC requires truthful endorsements and disclosure of material relationships. Synthetic media may require disclosure and must never be passed off as real experience.
- Medspa HIPAA coverage depends on entity and activities; determine Crown & Core's actual status with counsel. If HIPAA applies, marketing use of PHI generally needs a valid authorization, not just an ordinary release. Regardless, do not ingest customer identifiers/health records into this public repo or the prototype.
- A rights reference alone is **not** verified permission. The authorized reviewer must validate scope, channel, term, paid usage and revocation.
- Any treatment claim needs clinical/legal approval. Heuristic text checks do not establish regulatory compliance. Confirm current Meta ad rules and any age/targeting restrictions before publishing.
- The owner must approve customer contact, brand-defining creative, public publishing, booking changes and paid acquisition. Clinical/legal approvers separately approve claims.
- Paid media remains blocked until mobile booking, lead response, attribution and reputation/trust path have been verified per `_shared/policy/HEART_AND_SOUL.md`.

## 6. Architecture and delivery boundaries

Read [ARCHITECTURE.md](./ARCHITECTURE.md), [WIREFRAMES.md](./WIREFRAMES.md), and [INSTINCT_HANDOFF.md](./INSTINCT_HANDOFF.md). The existing `districts/media/references/COMMERCIAL_STUDIO_CONTRACT.md` governs external render ownership and supersedes any plan to recreate an editor/sound studio.

**Technology choice:** Node 22 built-ins for zero-dependency local proof API, MCP stdio bridge and domain tests; plain responsive HTML for the review/ask wireframe. This minimizes duplicate frameworks and secrets. Future authenticated production hosting, private database, durable workflow state and renderer adapters require an explicit runtime decision after inspecting existing deployment.

## 7. Delivery sequence

1. **P0 / local proof (this PR):** outcome API, MCP tools, rights/storyboard/review/approval gates, render plan only, tests, mobile-first prototype and runbook.
2. **P1 / authenticated infrastructure:** Instinct/Paperclip preflight from issue #25; identify correct Crown & Core private storage; implement scoped identity, signed approvals and encrypted asset storage; verify real Motion Master/Montage health and first MP4.
3. **P2 / controlled campaign:** creator opt-in, approved publishing/Meta integrations, mobile booking/lead response and actual attribution; measure conversion to booked and paid.
4. **P3 / repeatability:** campaign learning, creator renewal, quality/evaluation loops and bounded specialization, never uncontrolled bot proliferation.

### Non-goals
No new scheduler, no clone of a video editor, no automatic medical claims, no simulated success reported as production, no private client media in GitHub, no unapproved live actions.

## 8. Owner acceptance

Owner can say “make a video”, Instinct creates a real job receipt, Paperclip/Hermes orchestrates bounded tasks, a verified 30s and 15s video is returned, owner approves exact revision by authenticated voice/mobile, and a subsequent separately authorized publication has independently verifiable booking attribution. Until every step is proven, status remains **partial**.

## 9. Research basis and corrections

This specification draws on the Deep Research report (2026-11-12) and the repo's canonical Media/Heart-and-Soul contracts. External inspiration: [Margott Agency on medspa UGC](https://margottagency.com/blog/user-generated-content-strategy-for-medspas/), [BrandsForCreators medspa guide](https://brandsforcreators.com/influencers-for/med-spas), [UGC platform comparison](https://influencermarketinghub.com/user-generated-content-platforms/). These are market context, not evidence that StarNet has live integrations. Legal/policy requirements must be rechecked against **primary** FTC/HHS/Meta sources and counsel before launch.

The report's example HydraFacial pricing, example booking counts, unverified API names, generic voice “yes” approvals and assumption that every medspa is HIPAA-covered are **not accepted as operational facts**. The existing StarNet “One place” film is the default pilot until owner changes it.
