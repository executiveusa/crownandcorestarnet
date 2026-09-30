---
type: stage
district: management
stage: diagnose
---

# Gap Audit

## Inputs
- `_shared/state/current-state.json`

## Job
Rank only known customer-path leaks by proximity to payment. Preserve unknowns.

## Output
- `districts/management/output/GAP-AUDIT.md`

## Human check
Owner validates the selected leak before any intervention is built.

## Done
The report exists and does not infer a leak from unknown data.
