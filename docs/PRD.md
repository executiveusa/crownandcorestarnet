# Product Requirements Document — Crown & Core StarNet

**Product:** Crown & Core StarNet  
**Repository:** `executiveusa/crownandcorestarnet`  
**Status:** Build in progress  
**Owner mode:** proof-first, approval-gated  
**Primary manager:** Manny

## 1. Product statement

Crown & Core StarNet is an independent, client-specific operating system for Crown & Core. Its job is to help the business convert more existing demand, recover more existing customers, build owned media assets, improve follow-up and trust, and prove what creates bookings and revenue before buying more traffic.

It is not a social-media bot, an ads dashboard, or a generic agency template.

The operating question is:

> **Where is the closest measurable leak between interest and payment, and what is the smallest approved test that can prove a fix?**

## 2. Goals

### Business goals

1. Establish a verified baseline of Crown & Core's customer journey.
2. Identify the highest-value measurable leak closest to payment.
3. Run one bounded proof test at a time.
4. Recover revenue from existing customers and existing demand before scaling acquisition.
5. Build a reusable founder/expert media library without requiring the founder to become an influencer.
6. Make attribution visible enough to answer: what created the booking, return visit, inquiry, or revenue?
7. Preserve client ownership of data, assets, workflows, and decision history.

### Product goals

1. One independent StarNet instance for Crown & Core.
2. Manny as the coordinating manager.
3. Seven bounded operating rooms.
4. Shared Middleton methodology as a local district, with Crown & Core policy overrides.
5. Human approval for customer-facing, spending, booking, pricing, review, or health-claim actions.
6. Receipts for every completed external action.
7. Tool-agnostic business logic so Riverside, Perspective, Square, Meta, or another vendor can be replaced.

## 3. Non-goals

- Autonomous mass outreach.
- Autonomous ad spend.
- Autonomous public posting during proof mode.
- Review gating.
- Invented customer stories, founder quotes, testimonials, or clinical outcomes.
- Rebuilding the existing website before measurement proves it is needed.
- Treating likes, views, or followers as primary business success metrics.
- Depending on Pauli StarNet or any other client/project runtime.

## 4. Product architecture

```
CROWN & CORE STARNET
|
+-- MANNY -- manager / prioritization / approvals / reports
|
+-- CONVERSION
|   +-- website and mobile path
|   +-- Perspective/service funnels
|   +-- Square booking handoff
|   +-- attribution
|
+-- RETURN
|   +-- R3
|   +-- dormant-customer analysis
|   +-- rebooking
|   +-- memberships/packages where verified
|
+-- TRUST
|   +-- private feedback
|   +-- optional honest public review
|   +-- referrals
|   +-- testimonials with permission
|
+-- NURTURE
|   +-- inquiry follow-up
|   +-- reminders
|   +-- no-show recovery
|
+-- RECEPTION
|   +-- missed-call analysis
|   +-- after-hours capture
|   +-- FAQ routing
|   +-- human escalation
|
+-- MEDIA
|   +-- Crown & Core Podcast
|   +-- Riverside
|   +-- founder interviews
|   +-- expert/vendor interviews
|   +-- clips, articles, email, landing-page assets
|
+-- PERFORMANCE
    +-- experiment registry
    +-- receipts
    +-- attribution
    +-- monthly report
    +-- paid-media gate
```

## 5. Core method

### Decision loop

```
OBSERVE
-> DECIDE
-> BRIEF
-> APPROVE
-> EXECUTE
-> VERIFY
-> MEASURE
-> LEARN
```

### Revenue sequence

The local Middleton district provides the source sequence:

1. Conversion
2. Reactivation
3. Reviews + referrals
4. Lead nurturing
5. Reception
6. Sales coaching
7. Paid marketing last

Crown & Core policy controls execution. Source tactics never override client policy.

## 6. Manny requirements

Manny must:

- use verified Crown & Core facts before generic benchmarks;
- rank known leaks by proximity to payment and evidence quality;
- keep no more than three active workstreams;
- create a bounded experiment card before execution;
- surface missing data rather than inventing it;
- request owner approval for gated actions;
- assign work to the correct room;
- produce a receipt or mark an action unverified;
- produce a monthly owner report in plain language;
- keep paid media gated until prerequisites pass.

Manny must not autonomously:

- contact customers;
- publish posts;
- request reviews;
- issue rewards;
- change bookings;
- change prices;
- make clinical claims;
- spend money;
- change ad campaigns.

## 7. Data model

### Baseline state

Minimum business-state fields:

- mobile readiness
- page/load performance
- booking-path verification
- site sessions
- inquiries
- response time
- missed calls
- bookings
- no-shows
- completed visits
- returning visits
- dormant 90+ day customers
- review-flow status
- attribution status
- ad spend
- attributable revenue

Unknown values remain `null`. Unknown is a valid state.

### Action request

Every gated action requires:

- action ID
- action type
- target system
- audience
- copy/asset reference
- business reason
- expected metric
- cost ceiling
- stop condition
- rollback
- owner approval state
- approval actor
- approval timestamp

### Receipt

Every external execution eventually requires:

- action ID
- attempted timestamp
- system
- result status
- external identifier/URL where available
- cost incurred
- verification evidence
- error if failed

## 8. Approval model

### Read-only — no approval required

- research
- audits
- analysis
- transcript processing
- draft creation
- content ideas
- reports
- simulations
- synthetic tests

### Approval required

- customer SMS/email/DM
- review requests
- reward issuance
- public social posting
- booking changes
- pricing/offer changes
- paid media changes
- spend
- publishing health-related claims
- changing live website/funnel behavior

A valid approval is explicit, scoped, time-stamped, and tied to an action ID.

## 9. R3 requirements

R3 = **Review -> Reward -> Return**

Execution flow:

```
ELIGIBLE CUSTOMER
-> approved contact
-> private feedback/check-in
-> same reward regardless of sentiment
-> optional honest public review
-> return booking path
-> revenue measurement
```

Rules:

- no review gating;
- reward is never conditional on a positive rating or public review;
- negative/neutral feedback receives the same public-review option;
- consent/marketing eligibility must be checked before contact;
- outbound remains disabled until owner approval and a live connector exist.

Primary measurements:

- eligible
- contacted
- delivered
- responded
- feedback
- rewards issued
- rewards redeemed
- return bookings
- completed return visits
- attributable returned revenue

## 10. Media system requirements

### Capture sources

- Riverside remote podcast
- monthly media day
- founder interview
- expert/vendor interview
- staff expertise
- approved customer stories
- business environment/B-roll

### One-source-many-assets rule

A long-form source may generate:

- full episode
- short clips
- story cuts
- FAQ
- article
- email
- quote/static asset
- service landing-page proof
- future paid creative candidate

Every generated claim must trace to source material or verified business facts.

## 11. Conversion requirements

- mobile-first;
- clear service intent;
- message match from content/ad to destination;
- direct booking path;
- no unnecessary generic contact form when a booking/qualification flow is more appropriate;
- attribution parameters preserved;
- no full-site redesign in proof mode unless evidence justifies it.

Perspective is a candidate implementation for campaign/service funnels, not a hard dependency.

## 12. Reception and nurture requirements

The system must eventually support:

- missed-call event intake;
- inquiry event intake;
- immediate acknowledgement;
- qualification where appropriate;
- booking handoff;
- reminders;
- no-show recovery;
- human escalation;
- opt-out handling;
- event logging.

Live messaging remains disabled until connectors, consent rules, owner approval, and receipt logging are verified.

## 13. Performance and reporting

### Primary metrics

- attributable appointments
- completed visits
- returning customers
- reactivated customers
- qualified inquiries
- booking conversion
- no-show rate
- attributable revenue

### Secondary metrics

- booking clicks
- profile visits
- saves/shares
- meaningful comments
- completion/watch rate

### Diagnostic-only metrics

- followers
- raw views
- likes

## 14. Paid-media gate

Paid distribution cannot move from draft to live until:

- mobile destination verified;
- booking path verified;
- lead response functioning;
- attribution ready;
- trust/reputation basics inspected;
- owner approves creative, audience, budget, and stop condition.

Paid media amplifies a working system. It is not used to hide unresolved conversion leaks.

## 15. Integrations

Planned integration registry:

- Square — bookings/customer state/revenue
- Perspective — service-specific conversion funnels
- Riverside — podcast recording/transcripts
- Meta — read-only analytics first; write later behind approval
- Google Business Profile — reputation/read-only first
- GA4 / analytics — traffic and conversion events
- phone/communications provider — missed-call events and approved messaging
- storage/media library — original assets, transcripts, edits

Secrets must never be committed.

## 16. Scheduling

Proof-mode schedules may run read-only jobs:

### Daily
- ingest/validate available metrics
- identify missing measurements
- performance snapshot

### Weekly
- gap-audit refresh
- content/media brief
- R3 draft review
- experiment-status report

### Monthly
- full customer-journey audit
- owner report
- next-test recommendation

No schedule may trigger gated external actions without a valid approval record.

## 17. 30-day launch plan

### Week 1 — foundation

- StarNet client architecture
- Manny
- seven rooms
- Middleton district
- schemas
- approval gate
- integration registry
- Gap Audit

### Week 2 — business truth

- connect/import Square data
- verify website/booking path
- inspect analytics and Meta read-only
- inspect Google/reputation
- inspect phone/inquiry handling
- establish baseline

### Week 3 — first proof

Pick one verified leak closest to payment.

Likely candidates, subject to data:

- dormant-customer return
- missed inquiry
- missed call
- no-show recovery
- booking-path friction

Run one owner-approved bounded experiment.

### Week 4 — media + measurement

- first media day / podcast recording
- produce reusable asset manifest
- create matching service destination where justified
- calculate attributable result
- issue owner report
- choose month-two test

## 18. Acceptance criteria

Phase 1 is complete when:

- Crown & Core has an independent repo and runtime boundary;
- Manny and seven rooms are defined;
- Middleton district is local and policy-overridden;
- Gap Audit runs without network dependencies;
- unknown data remains unknown;
- approval-gate logic rejects unapproved gated actions;
- R3 can create a draft campaign plan without sending;
- Media engine can turn a source manifest into a repurposing plan without publishing;
- monthly report can be generated from state/experiment data;
- integration registry contains no secrets;
- test suite verifies core invariants.

Phase 2 is complete when real Crown & Core data is connected read-only and the first owner-approved test has a verifiable receipt and measured outcome.

## 19. Release gates

A production-capable action lane requires:

1. schema validation;
2. policy check;
3. explicit approval;
4. connector readiness;
5. dry-run receipt;
6. live action;
7. verification receipt;
8. rollback/stop behavior tested.

## 20. Build order

1. PRD and architecture contracts.
2. Room/permission registry.
3. Approval gate.
4. Gap Audit hardening.
5. R3 draft engine.
6. Media repurposing planner.
7. Monthly reporting.
8. Schedules manifest.
9. Integration contracts.
10. Automated invariant tests.
11. Real read-only connectors.
12. First approved live experiment.
13. Paid distribution only after gates pass.
