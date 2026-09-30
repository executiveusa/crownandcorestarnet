---
type: context
workspace: crown-and-core-starnet
form: umbrella-context-map
status: active
---

# Crown & Core StarNet

## Purpose

Operate Crown & Core through an ICM workspace where folders carry routing, contracts carry scope, outputs carry state, and the Docker runtime executes isolated agents with machine-verifiable receipts.

## Form

This workspace composes two ICM forms:

1. **Umbrella** — each district is a self-contained work area with its own contract.
2. **Context map** — the districts, agents, runtime, client truth, data, and handoffs form the operating graph.

Inside a district, numbered stage folders encode sequence only where the work actually has a sequence.

## Factory vs product

**Factory / stable across runs**
- `_system/` — runtime, permissions, schemas, schedules, tests, integration contracts.
- `_shared/` — Crown & Core facts, business model, customer journey, approved policy, shared evidence.

**Product / new or changing per run**
- `districts/*/output/`
- runtime receipts and mission artifacts
- experiment outputs

## Global execution loop

```
OBSERVE
-> DECIDE
-> DRAFT
-> HUMAN CHECK
-> EXECUTE
-> VERIFY
-> MEASURE
-> LEARN
```

## Human gates

Nothing customer-facing, public, clinical, financial, booking-changing, or ad-spending moves past draft without explicit approval.

## State

The filesystem is the state machine:
- no output = not started;
- draft output = awaiting review;
- approved marker + execution receipt = executed;
- verified receipt + measured artifact = verified.

Agent prose is never state.

## Isolation

Each worker has:
- one district;
- one task;
- one computer assignment;
- one scoped input bundle;
- one writable computer root.

See `_system/runtime/` after migration. During migration the working implementation remains at `runtime/` until moved and reverified.

## Migration status

The current repository predates this ICM contract. `docs/icm/MIGRATION_MAP.md` is the authoritative migration plan. No legacy file is deleted until its new home is verified.
