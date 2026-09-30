# Crown & Core StarNet

Independent operating system for Crown & Core.

This repository is **not Pauli StarNet** and does not depend on it.

## Start here

- Architecture / operating contract: `CONTEXT.md`
- Task router: `CLAUDE.md`
- System factory: `_system/`
- Shared Crown & Core truth: `_shared/`
- Business work: `districts/`
- ICM migration ledger: `docs/icm/MIGRATION_MAP.md`

## Proof standard

An agent saying "done" is not completion.

Completion requires a valid machine receipt, required assertions, and—where applicable—human approval.

Run:

```bash
npm run verify
npm run runtime:prove:docker
npm run runtime:mission:docker
```

## Current operating domains

- Management / Manny
- Conversion
- Return
- Trust
- Nurture
- Reception
- Media
- Performance
- Middleton method district

## Current live boundary

Proof mode remains read-mostly and approval-gated.

No autonomous:
- customer messaging
- public publishing
- review solicitation
- ad changes/spend
- booking changes
- clinical claims

## Next verified business slice

1. Populate `_shared/state/current-state.json` from authenticated read-only Crown & Core data.
2. Run the verified Gap Audit.
3. Select one evidence-backed leak closest to payment.
4. Draft one bounded fix inside the owning district.
5. Stop at the human gate.
6. Execute only after approval.
7. Save receipts and measured results.
