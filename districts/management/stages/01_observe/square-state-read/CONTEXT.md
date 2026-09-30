---
type: context
district: management
stage: 01_observe
job: authenticated-square-state-read
---

# Authenticated Square State Read

## Job

Perform a read-only authenticated Square pull, reduce it to non-PII operating metrics, and produce a hash-linked receipt.

## Inputs

- `CC_SQUARE_ACCESS_TOKEN`
- optional `CC_SQUARE_LOCATION_ID`
- `_system/integrations/adapters/square.mjs`
- `_system/integrations/normalize/square.mjs`

## Outputs

- `outbox/LIVE-SQUARE-SNAPSHOT.json`
- `outbox/LIVE-SQUARE-SNAPSHOT.receipt.json`

## Rules

- No customer record bodies may be written to output.
- No Square write endpoint may be called.
- Snapshot is observation only; it does not mutate `_shared/state/current-state.json`.
- Missing auth exits blocked.
- Orders without a location ID remain unavailable and must not be inferred.
- Marketing-attributable revenue remains unknown unless source linkage exists.

## Done

The snapshot and receipt exist, receipt hash matches the snapshot, and the receipt states zero write calls.
