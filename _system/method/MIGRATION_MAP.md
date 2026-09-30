# Crown & Core StarNet — ICM Migration Map

Status: final verification. All known legacy root copies have been moved to canonical ICM homes and removed on the v4 migration branch. Merge is allowed only after full CI, ICM walk, 17-computer Docker proof, and Docker mission proof pass.

The uploaded ICM Architect method is the architecture authority for this restructure.

## Hidden form

The repository is not one linear pipeline.

It is an **Umbrella + Context Map**:
- one Crown & Core identity;
- multiple isolated districts;
- each district owns its agents, contracts, stages, and outputs;
- stable factory layers are shared selectively;
- outputs and machine receipts carry state.

## Classification and canonical homes

| Legacy area | Role | Canonical ICM home |
|---|---|---|
| root architecture prose | Catalog / contract | `CLAUDE.md` + `CONTEXT.md` |
| `client/crown-and-core/` | Shared business truth | `_shared/client/` |
| `data/evidence/` | Shared evidence | `_shared/evidence/` |
| `data/current-state.json` | Shared operating state | `_shared/state/current-state.json` |
| `HEART_AND_SOUL.md` | Shared policy | `_shared/policy/HEART_AND_SOUL.md` |
| `config/` | System policy | `_system/policy/` |
| `runtime/` | Execution factory | `_system/runtime/` |
| `integrations/` | Connectors | `_system/integrations/` |
| `schemas/` | Machine contracts | `_system/schemas/` |
| `schedules/` | Scheduling | `_system/schedules/` |
| `scripts/` | System utilities | `_system/scripts/` |
| `lib/` | Shared system code | `_system/lib/` |
| `registry/` | Workspace registry | `_system/registry/` |
| `test/` | Verification factory | `_system/tests/` |
| `workflows/*` | Shared pipeline or district process | `_system/pipelines/` or district `stages/` |
| `agents/workers/*` | Agent contracts | `districts/<district>/agents/<agent>/` |
| `agents/manny/` | Management agent | `districts/management/agents/manny/` |
| `districts/*/district.json` | Redundant contract metadata | district `CONTEXT.md` + `_system/registry/` |
| root `UPSTREAM.md` | Engineering reference | `_system/references/UPSTREAM.md` |
| root `docs/` | Stable system references | `_system/references/` + `_system/method/` |
| generated receipts | Product/state | runtime receipt store; generated, never hand-edited |

## Target tree

```
crownandcorestarnet/
├── CLAUDE.md
├── CONTEXT.md
├── README.md
├── ARCHITECTURE.md
├── package.json
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
│   ├── tests/
│   ├── scripts/
│   ├── registry/
│   ├── references/
│   └── lib/
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

A district may contain:

```
district/
├── CLAUDE.md
├── CONTEXT.md
├── agents/
├── references/
├── stages/
└── output/
```

Numbered stage folders exist only where a real sequence exists. No speculative empty stages are required.

## Migration law

1. Inventory before move.
2. Create the canonical contract/home.
3. Copy content.
4. Repoint code and references.
5. Run verification.
6. Delete the legacy copy.
7. Run verification again.
8. Merge only after the walk test and Docker proofs pass.

## Verified migration ledger

| Slice | Status | Evidence |
|---|---|---|
| Root router + district contracts | VERIFIED | ICM walk + full CI |
| District-owned agent prompts | VERIFIED | 17-agent runtime registry + Docker proof |
| Shared Crown & Core truth -> `_shared/` | VERIFIED | scope manifests + CI |
| Runtime authority -> `_system/runtime/` | VERIFIED | full CI + 17-container proof |
| Shared pipelines/tests -> `_system/` + district stages | VERIFIED | PR #12 full CI + Docker proof |
| Policy/integrations/schemas/schedules/scripts/lib/registry/references -> `_system/` | FINAL VERIFICATION | v4 branch |
| Legacy root duplicates removed | FINAL VERIFICATION | ICM walk fails if any forbidden legacy root returns |
| Redundant district.json files removed | FINAL VERIFICATION | canonical registry + district CONTEXT contracts |
| Root docs payload moved into canonical system references/method | FINAL VERIFICATION | v4 branch |

## Completion condition

The migration is complete only when:
- no forbidden legacy root copy remains;
- every district contract is reachable from the root router;
- every registered agent prompt lives under its owning district;
- `npm run verify` passes;
- `npm run runtime:prove:docker` passes;
- `npm run runtime:mission:docker` passes;
- the proof receipts are uploaded by CI.
