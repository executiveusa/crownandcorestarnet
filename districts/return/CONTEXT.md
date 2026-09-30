---
type: context
district: return
status: active
---

# Return District

## Job

Recover and retain customers already earned through R3, reactivation, rebooking, and repeat-visit analysis.

## Inputs

- `../../_shared/client/`
- `../../_shared/state/current-state.json`
- `../middleton/references/`

Load only the specific files required for the task. Do not crawl those folders wholesale.

## Agents

- `reactivation-analyst`
- `r3-planner`

Each agent has one computer assignment and one scoped input bundle in the runtime registry.

## Process

1. Read this contract.
2. Read the task and declared inputs.
3. Produce a plain-file draft in `output/`.
4. Stop at the human gate when required.
5. Execute only after approval.
6. Save machine receipt/evidence.
7. Performance verifies before the work is called done.

## Outputs

- `output/reactivation-analysis.md`
- `output/r3-plan.md`
- `output/return-receipt.md`

Outputs are edit surfaces. Human edits become the next step's input.

## Human check

Approve audience, consent basis, offer, message, reward, and live send.

## Done

Done means the expected output exists **and** the required machine receipt/assertions pass. Agent prose is not completion evidence.
