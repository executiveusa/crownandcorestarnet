---
type: context
district: management
stage: 01_observe
job: live-readiness
---

# Live Readiness

## Job

Report which Crown & Core integrations can run now, which are blocked, and the single next access item that unlocks the most business truth.

## Inputs

- `_system/integrations/contracts.json`
- process environment variable presence only

Never print secret values.

## Outputs

- `outbox/LIVE-READINESS.json`
- `districts/management/output/live-readiness.md`

## Rules

- Presence checks only; no connector calls.
- Do not infer that a credential is valid merely because it exists.
- Rank Square first because it unlocks bookings, customers, return behavior, and revenue-side observations needed by the current Gap Audit.
- Provider-TBD connectors remain blocked until a provider is explicitly selected.

## Done

The machine JSON and plain-language management output both exist and agree on ready/blocked status.
