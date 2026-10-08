# Crown & Core access handoff

No live credentials belong in git.

## Operator commands

```bash
npm run live:readiness
npm run square:state:read
npm run state:promote -- --snapshot=outbox/LIVE-SQUARE-SNAPSHOT.json --receipt=outbox/LIVE-SQUARE-SNAPSHOT.receipt.json
```

The first command is safe without credentials. The Square read is authenticated/read-only. State promotion defaults to dry-run and requires a hash-bound approval file for `--apply=true`.

## What can run now

- public website/listing evidence
- local/deterministic agent proofs
- Docker computer proofs
- draft-only workflows
- receipt verification

## What becomes possible after read-only access

### Square

**Priority: first live connector.** It unlocks the closest-to-payment operating truth needed for the first real Gap Audit.

Needed first:
- read-only API access/token
- Crown & Core location identifier if the account uses multiple locations

Questions it unlocks:
- customers
- bookings
- completed visits
- no-shows/cancellations where available
- dormant customers
- returning customer patterns
- service-level revenue signals where available

### Meta
Needed first:
- read-only token
- ad account ID
- page/Instagram IDs if organic/account analytics are in scope

Questions it unlocks:
- actual spend
- campaigns/creatives
- clicks/leads
- destination URLs
- attributable events configured in Meta

### Google Business
Needed first:
- authorized Google access
- business account/location IDs if required

Questions it unlocks:
- current profile state
- current review/reputation data
- owner responses
- listing consistency

### GA4 / analytics
Needed first:
- property ID
- authorized Google access

Questions it unlocks:
- sessions
- source/medium
- landing paths
- booking clicks/events
- campaign attribution as currently configured

### Communications
Provider must first be identified.

Questions it unlocks:
- missed calls
- response time
- inquiry volume
- after-hours demand
- approved SMS/email later

### Perspective / Riverside
Needed when the owner approves software purchase and account setup.

## Rule

Connect read-only first. Do not request write scopes until the exact approved workflow requires them.


## State promotion law

Authenticated connector data never silently overwrites Crown & Core state.

Flow:

```
AUTHENTICATED READ
-> REDUCED NON-PII SNAPSHOT
-> HASHED CONNECTOR RECEIPT
-> DRY-RUN CANDIDATE
-> HUMAN APPROVAL BOUND TO SNAPSHOT HASH
-> PROMOTION
-> PROMOTION RECEIPT
```

Synthetic fixtures are rejected by the promotion gate.
