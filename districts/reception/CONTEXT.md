---
type: context
district: reception
status: active
---

# Reception District

## Job

Capture missed calls and after-hours demand, answer bounded FAQs, and escalate to humans.

## Inputs

- `../../_shared/client/`
- `../../_shared/state/current-state.json`
- `../../_shared/policy/`

Load only the specific files required for the task. Do not crawl those folders wholesale.

## Agents

- `missed-call-auditor`
- `receptionist-designer`

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

- `output/missed-call-audit.md`
- `output/reception-flow.md`
- `output/reception-receipt.md`

Outputs are edit surfaces. Human edits become the next step's input.

## Human check

Approve live phone/SMS behavior; clinical questions always escalate appropriately.

## Done

Done means the expected output exists **and** the required machine receipt/assertions pass. Agent prose is not completion evidence.
