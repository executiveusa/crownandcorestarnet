# Crown & Core Creator Studio — Product Requirements (v0.2)

**Status:** code-side integration candidate in review-ready PR #26; not deployed or connected. **Owner:** Crown & Core. **Product:** standalone Crown & Core experience within the existing StarNet repository, not a new company-wide SaaS, not MACS, not BufferBlaster.

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
- **Creative proof:** one 30s + 15s **playable, verified** external render using licensed/owner-owned media, with provider IDs, asset hashes and QA receipt. **Adapter, signed callback, private-file QA and approval code implemented; actual provider/MP4 not yet connected or verified.**
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

**Code-side implemented in this PR:** P0 API/MCP and outcome-first offline UI; single-host SQLite store and append-only receipt table; pinned OIDC MFA reviewer verification; nine agent-only MCP tools; creator shortlist, permission-bound outreach and release workflows; independently reviewed rights and capped render authorization; authenticated external renderer adapter and signed callbacks; ffprobe/sha256 real MP4 inspection; final film approval, organic publication reservation/adapter, rights revocation/takedown and source-backed aggregate attribution. **Not delivered:** real Instinct/Paperclip/Hermes connection, live Motion Master/Montage rendering, configured IdP/private vault, actual MP4, public posting or paid Meta ads. External integrations and real-world proofs remain P1/P2 acceptance gates.

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

**Technology choice:** Node 22.23+ built-ins for REST/MCP, SQLite single-host persistence, HMAC callbacks, OIDC RS256 verifier, ffprobe-backed QA and external HTTP adapters; plain responsive HTML for offline owner UX. No extra framework or duplicate video editor. Node 22's SQLite API is experimental and requires an explicit single-host production decision; encrypted volume, IdP, media vault, actual provider endpoints and supported agent runtime must be verified on the owner's server. See [OPERATIONS.md](./OPERATIONS.md).

## 7. Delivery sequence

1. **Code-side (this PR):** outcome API, nine MCP tools, creator permission workflow, rights/claims gates, pinned reviewer identity, private single-host persistence, provider adapters, signed callbacks, independent video QA, final film approval, organic post controls, tests, offline mobile-first prototype and runbook.
2. **P1 / authenticated server connection:** Instinct/Paperclip preflight from issue #25; configure correct Crown & Core encrypted private storage, IdP, media vault, renderer bridge and live agent-originated MCP call; verify first real MP4 and owner review. No duplicate scheduler.
3. **P2 / controlled campaign:** connect opted-in creator contact and organic publication only with separate owner approval, mobile booking/lead response and real attribution. Paid Meta integration remains a separate unimplemented, unapproved feature.
4. **P3 / repeatability:** campaign learning, creator renewal, quality/evaluation loops and bounded specialization, never uncontrolled bot proliferation.

### Non-goals
No new scheduler, no clone of a video editor, no automatic medical claims, no simulated success reported as production, no private client media in GitHub, no unapproved live actions.

## 8. Owner acceptance

Owner can say “make a video”, Instinct creates a real job receipt, Paperclip/Hermes orchestrates bounded tasks, a verified 30s and 15s video is returned, owner approves exact revision by authenticated voice/mobile, and a subsequent separately authorized publication has independently verifiable booking attribution. Until every step is proven, status remains **partial**.

## 9. Research basis and corrections

This specification draws on the Deep Research report (2026-11-12) and the repo's canonical Media/Heart-and-Soul contracts. External inspiration: [Margott Agency on medspa UGC](https://margottagency.com/blog/user-generated-content-strategy-for-medspas/), [BrandsForCreators medspa guide](https://brandsforcreators.com/influencers-for/med-spas), [UGC platform comparison](https://influencermarketinghub.com/user-generated-content-platforms/). These are market context, not evidence that StarNet has live integrations. Legal/policy requirements must be rechecked against **primary** FTC/HHS/Meta sources and counsel before launch.

The report's example HydraFacial pricing, example booking counts, unverified API names, generic voice “yes” approvals and assumption that every medspa is HIPAA-covered are **not accepted as operational facts**. The existing StarNet “One place” film is the default pilot until owner changes it.
