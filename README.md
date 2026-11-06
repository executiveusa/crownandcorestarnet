# Crown & Core StarNet

Independent operating system for Crown & Core.

This repository is **not Pauli StarNet** and does not depend on it.

## Start here

- Architecture / operating contract: `CONTEXT.md`
- Task router: `CLAUDE.md`
- System factory: `_system/`
- Shared Crown & Core truth: `_shared/`
- Business work: `districts/`
- ICM migration ledger: `_system/method/MIGRATION_MAP.md`

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

## Instinct / Paperclip knowledge entrypoint (new, staging)

Start with [AGENTS.md](AGENTS.md), [the source register](knowledge/SOURCE_REGISTER.md), and [Paperclip binding instructions](.paperclip/README.md). Node 22 agents can use `npm run knowledge:mcp` to start a read-only source-cited MCP knowledge tool, or `npm run knowledge:search -- "Square booking"` to query the bounded catalog. Run `npm run knowledge:test` for the regression suite.

**Control-plane clarification:** Paperclip is intended to replace active StarNet task scheduling. Existing `_system/runtime/` is retained as tested historical agent-execution reference, not an authorized parallel scheduler. This public repo is NOT a private client database; private agreements, Square customer records and health information are excluded until a verified authorized, tenant-isolated connector is configured. No live Paperclip/Instinct/Supabase connection is claimed.
