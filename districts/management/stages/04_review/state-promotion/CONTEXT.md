---
type: context
district: management
stage: 04_review
job: state-promotion
---

# State Promotion

## Job

Promote verified connector observations into Crown & Core shared operating state only after hash verification and explicit approval.

## Inputs

- connector snapshot
- connector receipt
- approval file
- `_shared/state/current-state.json`

## Rules

- Default is dry-run.
- Snapshot must be authenticated, read-only, and non-synthetic.
- Receipt hash must match the snapshot bytes.
- Receipt must report zero write calls.
- Approval must explicitly authorize `state_promotion`.
- Only non-null metrics already defined in current state may be promoted.
- Existing public proof fields are preserved.
- Promotion writes an audit receipt.
- No customer PII is written into shared state.

## Done

Dry-run produces a candidate diff. Apply mode additionally writes the shared state and a promotion receipt.
