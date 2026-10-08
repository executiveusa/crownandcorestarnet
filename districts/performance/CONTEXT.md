---
type: context
district: performance
status: active
---

# Performance District

## Job

Verify receipts, attribution, experiment results, and whether claimed work actually happened.

## Inputs

- `../../_shared/state/current-state.json`
- `../../_system/runtime/receipts/`
- declared output paths from the district being verified

Load only the specific files required for the task.

## Agents

- `attribution-auditor`
- `receipt-verifier`

## Process

1. Read this contract.
2. Read the exact artifact and receipt under review.
3. Recalculate or hash-check where possible.
4. Record mismatches instead of smoothing them over.
5. Produce a plain-file verification report.
6. Only a passed receipt/assertion may close a stage.

## Outputs

- `output/attribution-report.md`
- `output/verification-report.md`
- `output/monthly-scoreboard.md`

## Human check

Review discrepancies and decide whether evidence is sufficient to close a stage.

## Done

Agent prose is never completion evidence. Required receipts and assertions must pass.


## Output-state rule

The runtime may populate declared agent outputs automatically only from an **operationally verified** receipt. Structural and gateway proof runs must not write business state into this district's `output/` surfaces. Human edits remain allowed; source receipts preserve provenance.
