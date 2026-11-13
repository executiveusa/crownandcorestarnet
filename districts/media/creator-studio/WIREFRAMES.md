# Creator Studio — low-friction wireframes and conversation design

**Design principle:** one business outcome, one concise status, one decision when needed. Agents operate through API/MCP without a human screen. The interface is a fallback and an owner review surface, not an admin dashboard.

## 1. Owner / mobile: ASK (primary)

```text
┌────────────────────────────────┐
│ CROWN & CORE       CREATOR      │
│                     STUDIO     │
│                                │
│ What do you want               │
│ to make happen?                │
│                                │
│ ┌────────────────────────────┐ │
│ │ Make a short film that     │ │
│ │ helps new guests trust us. │ │
│ └────────────────────────────┘ │
│                                │
│  [ Introduce us ] [ Bookings ] │
│  [ Creator story ]             │
│                                │
│  [ Prepare my request → ]      │
│                                │
│  Or just tell Instinct by voice│
│  [ Copy request for Instinct ] │
│                                │
│  No publishing. No spending.   │
└────────────────────────────────┘
```

One large input, optional suggested outcomes. No persona dropdown, ad-budget slider, provider selection, analytics, or model settings in the primary view. Voice capture is handled by **existing Instinct**; a fake browser microphone is not displayed.

## 2. Owner / mobile: MAKING (agent-run status)

```text
┌────────────────────────────────┐
│ ONE PLACE — FILM               │
│                                │
│ ● Draft created                │
│ ○ Rights/source verification   │
│ ○ Storyboard review            │
│ ○ Production & QA              │
│                                │
│ Next: approved footage needed  │
│                                │
│ [ View proposed story ]        │
│ [ Ask Instinct for status ]    │
└────────────────────────────────┘
```

Only state that is supported by receipts. The system never shows a fake progress percentage, synthetic bookings or a video placeholder masquerading as an export. “Making” may stay blocked indefinitely with a concrete reason.

## 3. Owner / mobile: REVIEW (future authenticated production)

```text
┌────────────────────────────────┐
│ Ready for your decision        │
│                                │
│ ┌────────────────────────────┐ │
│ │   Verified MP4 preview     │ │
│ │   00:30   9:16            │ │
│ └────────────────────────────┘ │
│                                │
│ One place · Version 4          │
│ Real facility footage          │
│ Rights verified · Claims: none │
│                                │
│ [ Approve this version ]       │
│ [ Ask for a change ]           │
│                                │
│ This approves the film ONLY.   │
│ Publishing is a separate step. │
└────────────────────────────────┘
```

A preview appears only when the provider supplies a real, hash-verified playable artifact. Approval challenge must be tied to asset hash, version, action, owner identity and expiry. Voice “yes” alone is **not** sufficient authentication.

## 4. Owner / mobile: RESULT (future)

```text
┌────────────────────────────────┐
│ Your film is ready             │
│                                │
│ 30s  [ View ]  15s [ View ]    │
│                                │
│ Produced ✓   Approved ✓        │
│ Published: Not authorized      │
│ Bookings: Not yet measured     │
│                                │
│ [ Ask Instinct what's next ]   │
└────────────────────────────────┘
```

Do not show fabricated reach or revenue. Results require separate verified publishing and attribution receipts.

## 5. Agent-only path (no GUI)

```text
Instinct (voice intent)
  → creator_outcome_create
  → Paperclip existing task (after runtime verification)
  → Hermes scoped specialists
  → creator_source_register
  → creator_storyboard_propose
  → creator_review_request
  → owner/clinical authenticated approval channel (NOT agent MCP)
  → creator_render_plan_prepare
  → STOP at provider verification / spend gate (P0)
```

The backend is not a form handler. The API/MCP is the primary product interface. The human interface is a **notification and decision surface**.

## 6. Example voice dialogue — correct approvals

**Owner:** “Instinct, make a warm 30-second introduction to Crown & Core for people considering their first visit. I want inquiries, not likes.”

**Instinct:** “I opened the film request. I’ll use approved Crown & Core footage and prepare 30- and 15-second versions. I’ll ask you only when rights or a creative decision needs your approval.”

**Instinct later:** “The storyboard is ready, but the footage rights are not verified. I cannot send it to production yet. Do you want me to request the missing release from the authorized owner?”

**Owner:** “Yes, request it.”

**Instinct:** “I can prepare the request. Sending it to a person requires the approved outreach channel and your separate authorization.”

**Instinct after verified render (future):** “The film is ready to review. Thirty seconds, version four, using approved facility footage. Would you like the preview?”

**Owner:** “Approve that version.”

**Instinct:** “Please confirm through the authenticated approval challenge for version four. This does not authorize posting or spending.”

**Owner after authenticated decision:** “Post it organically.”

**Instinct:** “That is a separate public action. I’ll check channel permissions, current brand/clinical review and publication approval before proceeding.”

## 7. States and error language

| System state | Spoken or shown summary |
| --- | --- |
| DRAFT | “I created the request. The next step is verified footage and a storyboard.” |
| REVIEW_PENDING | “The draft needs your review. No video has been rendered.” |
| READY_FOR_RENDER_PLAN | “This revision is approved for planning, not production.” |
| RENDER_PLAN_READY | “The render plan is prepared. Provider access and execution authorization are still required.” |
| RIGHTS_DENIED | “The footage cannot be used under the current license.” |
| CLINICAL_BLOCKED | “A treatment claim needs qualified clinical/legal approval.” |
| PROVIDER_UNAVAILABLE | “The rendering provider is unavailable. No job was submitted.” |
| PUBLISHED_VERIFIED | “Published on [verified channel] with receipt [id].” (future only) |

## 8. Visual language and accessibility

- Dark evergreen/charcoal, warm ivory, restrained muted gold; editorial serif headings, clear sans-serif controls.
- Mobile-first 360px to desktop; minimum 44px touch targets, visible focus, semantic labels, live status text, reduced-motion support.
- Large preview when real; no autoplay sound, no fake “AI generated video” animation.
- One primary action per state; collapsible advanced details for operations staff.
- Voice is via Instinct; accessible text/mobile fallback remains available.
- No dark patterns, fake urgency, “instant results” claims, or invented testimonials.

## 9. Handoff to design review

The implemented `index.html` is a **no-network prototype** of ASK + local storyboard proposal; it is not the authenticated production REVIEW screen. Review at 360px, 390px, 768px and 1440px, including keyboard and screen reader checks. Compare against the state contracts above before approving visual design.
