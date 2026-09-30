---
type: context
job: system-factory
---

# _system

## Job

Hold the stable execution factory for Crown & Core StarNet.

## Canonical contents

- `method/` — ICM architecture authority and reusable method rules
- `runtime/` — isolated agents, computers, scopes, orchestration, receipts
- `policy/` — permissions and room policy
- `integrations/` — connector contracts, adapters, normalizers
- `schemas/` — machine contracts
- `schedules/` — proof-mode schedules
- `templates/` — copy-to-instantiate starters
- `pipelines/` — shared system processes
- `tests/` — verification and walk tests
- `scripts/` — system/bootstrap utilities
- `registry/` — machine-readable workspace maps
- `references/` — stable engineering references

## Reads

- root `CONTEXT.md`
- stable system rules only

## Writes

System code and contracts. Never business-run outputs.

## Human check

Any change that alters permissions, isolation, approval rules, external-action behavior, or canonical architecture requires review and a successful full verification run before merge.

## Done

A system change is not complete until:
- `npm run verify` passes;
- Docker computer proof passes;
- Docker mission proof passes;
- the ICM walk test passes.
