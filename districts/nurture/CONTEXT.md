---
type: context
district: nurture
status: active
---

# Nurture District

## Job

Reduce lost inquiries, slow response, no-shows, and failed follow-up.

## Inputs

- `../../_shared/client/`
- `../../_shared/state/current-state.json`

Load only the specific files required for the task. Do not crawl those folders wholesale.

## Agents

- `lead-response-auditor`
- `recovery-planner`

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

- `output/response-audit.md`
- `output/recovery-plan.md`
- `output/nurture-receipt.md`

Outputs are edit surfaces. Human edits become the next step's input.

## Human check

Approve customer-facing follow-up or automation before live execution.

## Done

Done means the expected output exists **and** the required machine receipt/assertions pass. Agent prose is not completion evidence.


## Output-state rule

The runtime may populate declared agent outputs automatically only from an **operationally verified** receipt. Structural and gateway proof runs must not write business state into this district's `output/` surfaces. Human edits remain allowed; source receipts preserve provenance.
