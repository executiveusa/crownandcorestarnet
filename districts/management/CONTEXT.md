---
type: context
district: management
status: active
---

# Management District

## Job

Coordinate Crown & Core work, choose the next verified priority, route tasks, enforce approval gates, and issue owner reports.

## Inputs

- `../../_shared/client/`
- `../../_shared/state/current-state.json`
- `../../_system/policy/`
- `../performance/output/`

Load only the specific files required for the task. Do not crawl those folders wholesale.

## Agents

- `manny`

Each agent has one computer assignment and one scoped input bundle in the runtime registry.

## Process

1. Read this contract.
2. If live business truth is required, run the Live Readiness stage before proposing work.
3. Read the task and declared inputs.
4. Produce a plain-file draft in `output/`.
5. Stop at the human gate when required.
6. Execute only after approval.
7. Save machine receipt/evidence.
8. Performance verifies before the work is called done.

## Outputs

- `output/priority.md`
- `output/owner-report.md`
- `output/approved-mission.json`
- `output/live-readiness.md`

Outputs are edit surfaces. Human edits become the next step's input.

## Human check

Owner approves gated missions, priorities that change commercial direction, and any external action.

## Done

Done means the expected output exists **and** the required machine receipt/assertions pass. Agent prose is not completion evidence.
