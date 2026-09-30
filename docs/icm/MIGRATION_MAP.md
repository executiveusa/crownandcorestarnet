# Crown & Core StarNet — ICM Migration Map

Status: active migration. Runtime authority has moved to `_system/runtime/` and the legacy runtime copy has been removed after machine proof.

The uploaded ICM Architect method is the architecture authority for this restructure.

## Hidden form found

The repository is not one linear pipeline.

It is an **Umbrella + Context Map**:
- one Crown & Core identity;
- multiple isolated districts;
- each district has its own agents and process;
- stable factory layers are shared selectively;
- outputs/receipts carry state.

## Classification

| Current area | Role | Target |
|---|---|---|
| `README.md`, `ARCHITECTURE.md` | Catalog / contract | root `CLAUDE.md` + `CONTEXT.md` |
| `client/crown-and-core/` | Factory | `_shared/client/` |
| `data/evidence/` | Factory evidence | `_shared/evidence/` |
| `data/current-state.json` | Working state | `_shared/state/current-state.json` |
| `config/` | Factory policy | `_system/policy/` |
| `runtime/` | Factory execution | `_system/runtime/` |
| `integrations/` | Factory connectors | `_system/integrations/` |
| `schemas/` | Factory schemas | `_system/schemas/` |
| `schedules/` | Factory scheduling | `_system/schedules/` |
| `test/` | Factory verification | `_system/tests/` |
| `agents/workers/*` | District agent contracts | `districts/<district>/agents/<agent>/` |
| `agents/manny/` | Management contract | `districts/management/agents/manny/` |
| `workflows/*` | Process contracts/code | district `stages/` or `_system/pipelines/` |
| `districts/*/district.json` | Contract metadata | district `CONTEXT.md` + machine config |
| generated receipts | Product/state | runtime receipt store, indexed not hand-edited |

## Target tree

```
crownandcorestarnet/
├── CLAUDE.md
├── CONTEXT.md
├── _system/
│   ├── CONTEXT.md
│   ├── method/
│   ├── runtime/
│   ├── policy/
│   ├── integrations/
│   ├── schemas/
│   ├── schedules/
│   ├── templates/
│   ├── pipelines/
│   └── tests/
├── _shared/
│   ├── CONTEXT.md
│   ├── client/
│   ├── evidence/
│   ├── state/
│   ├── policy/
│   └── references/
└── districts/
    ├── management/
    ├── conversion/
    ├── return/
    ├── trust/
    ├── nurture/
    ├── reception/
    ├── media/
    ├── performance/
    └── middleton/
```

Each district uses:

```
district/
├── CONTEXT.md
├── agents/
├── references/
├── stages/
│   ├── 01_observe/
│   ├── 02_diagnose/
│   ├── 03_draft/
│   ├── 04_review/
│   ├── 05_execute/
│   └── 06_verify/
└── output/
```

Stages that do not actually exist for a district must not be invented. The six-stage skeleton is only instantiated where the district's real process needs it.

## Migration law

1. Inventory before move.
2. Create target contract.
3. Copy content to one new home.
4. Update runtime paths/tests.
5. Run all CI + Docker isolation proof.
6. Only then delete the legacy copy.
7. Never merge a migration slice that breaks the walk test or runtime proof.

## ICM-specific corrections to the current build

- Root routing was too content-heavy and fragmented.
- Agent prompts lived apart from district ownership.
- Runtime/config/data were structurally mixed with business work.
- Several workflow READMEs behaved as contracts but were not named/located as contracts.
- State existed partly in JSON and partly in prose rather than being readable from output surfaces.
- District isolation existed at runtime, but the filesystem did not yet mirror that isolation cleanly.

## What remains unchanged

ICM does not remove the need for actual isolated agent computers here.

The uploaded method explicitly notes that real multi-agent/high-concurrency behavior can require framework code. Crown & Core keeps the Docker execution layer; ICM becomes the human-readable architecture and context-routing layer around it.


## Verified migration ledger

| Slice | Status | Evidence |
|---|---|---|
| Root router + district contracts | VERIFIED | ICM walk test + full CI |
| District-owned agent prompts | VERIFIED | 17-agent runtime registry + Docker proof |
| Shared Crown & Core truth copies | VERIFIED AS READ INPUTS | Docker scope manifests read from `_shared/` |
| Runtime authority -> `_system/runtime/` | IN VERIFICATION | PR #11 full CI and 17-container proof |
| Legacy `runtime/` removal | IN VERIFICATION | Must pass PR #11 after deletion |
| Remaining policy/integrations/tests/workflows | NOT YET MIGRATED | Future slices |
