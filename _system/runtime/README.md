# Crown & Core runtime

## Commands

```bash
npm run runtime:validate
npm run runtime:prove
npm run runtime:prove:docker
npm run runtime:mission:docker
npm run runtime:mission:gateway-proof
npm run runtime:mission:operational
```

## Meaning

- `runtime:prove` — local development process proof.
- `runtime:prove:docker` — one isolated networkless Docker computer per agent.
- `runtime:mission:docker` — structural all-agent mission using the fixture model.
- `runtime:mission:gateway-proof` — all agents run in their own internal Docker networks and reach only the Crown & Core model gateway; deterministic mock upstream; no live-business claim.
- `runtime:mission:operational` — same isolation topology with a live upstream model; requires host-side model credentials.

## Receipt law

Runtime identity, isolation, context, model path, artifact hashes, and task assertions are recorded in machine receipts.

A receipt may be:
- structural;
- gateway;
- operational.

Only `operational` may set `business_output_verified=true`.

Generated runtime state is under `.runtime/` and is gitignored.
