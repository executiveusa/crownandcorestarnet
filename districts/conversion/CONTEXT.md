---
type: context
district: conversion
status: active
---

# Conversion District

## Job

Reduce friction between discovery and completed booking without redesigning blindly.

## Inputs

- `../../_shared/client/`
- `../../_shared/evidence/`
- `../../_shared/state/current-state.json`

Load only the specific files required for the task. Do not crawl those folders wholesale.

## Agents

- `path-auditor`
- `funnel-builder`

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

- `output/path-audit.md`
- `output/funnel-brief.md`
- `output/booking-proof.md`

Outputs are edit surfaces. Human edits become the next step's input.

## Human check

Approve live funnel/site/booking changes before execution.

## Done

Done means the expected output exists **and** the required machine receipt/assertions pass. Agent prose is not completion evidence.


## Output-state rule

The runtime may populate declared agent outputs automatically only from an **operationally verified** receipt. Structural and gateway proof runs must not write business state into this district's `output/` surfaces. Human edits remain allowed; source receipts preserve provenance.
