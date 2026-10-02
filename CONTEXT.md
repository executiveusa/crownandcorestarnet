---
type: context
workspace: crown-and-core-starnet
form: umbrella-context-map
status: active
---

# Crown & Core StarNet

## North star

Read `MISSION.md` for project intent and anti-drift law.

The primary current product mission is the Crown & Core website challenge. ICM, StarNet/Instinct, runtime, permissions, integrations, and other districts support that mission; they do not replace it.

Website work routes to `districts/conversion/site/CONTEXT.md`.

## Workspace purpose

Operate Crown & Core through an ICM workspace where folders carry routing, contracts carry scope, outputs carry state, and isolated runtime tools can execute approved work with machine-verifiable receipts.

## Form

This workspace composes:
1. **Umbrella** — each district is a self-contained work area.
2. **Context map** — districts, agents, runtime, client truth, data, and handoffs form the operating graph.
3. **Pipeline** — the website challenge uses a real sequential pipeline under `districts/conversion/site/`.

## Factory vs product

**Factory / stable across runs**
- `_system/` — runtime, permissions, schemas, schedules, tests, integration contracts.
- `_shared/` — Crown & Core facts, brand assets, business truth, policy, shared evidence.

**Product / new or changing per run**
- `districts/conversion/site/product/` — current website product.
- district output folders — work/proof surfaces.
- runtime receipts and mission artifacts.
- experiment outputs.

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

Nothing customer-facing, public, clinical, financial, booking-changing, brand-defining, or ad-spending moves past the declared gate without explicit approval.

## State

The filesystem is the state machine:
- no output = not started;
- draft output = awaiting review;
- approved marker + execution receipt = executed;
- operationally verified agent output + source receipt = verified analysis;
- verified receipt + measured artifact = verified execution/result.

Agent prose is never state.

## Isolation

Each worker receives only the current contract and declared inputs. Do not crawl the entire repository.

## Current priority

Build and prove the Crown & Core site before expanding supporting architecture. If architecture work competes with producing the website, the website wins unless the architecture is a verified blocker.

## Migration status

The underlying ICM restructure is already canonical and verified. `_system/method/MIGRATION_MAP.md` records that migration. The website challenge is now a first-class product pipeline inside the conversion district.
