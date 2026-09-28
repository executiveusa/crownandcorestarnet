# Crown & Core StarNet

Independent operating system for Crown & Core.

This repository is **not Pauli StarNet** and does not depend on it.

It uses the open-source `androoAGI/starnet` codebase as an upstream engineering base while maintaining its own Crown & Core runtime, client logic, agents, districts, data, approvals, workflows, and reporting.

## Runtime proof standard

Every district is isolated. Every execution agent has its own registered computer identity, dedicated workspace, HOME/TMP directories, child process, explicit task assignment, and machine-verifiable receipt.

An agent saying "done" is not completion. Completion requires a valid receipt and evidence.

Run:

```bash
npm run runtime:validate
npm run runtime:prove
```

See `docs/RUNTIME_ISOLATION.md`.

## Current build

### Manager
- **Manny** — Crown & Core operating manager

### Live districts
- **Middleton District** — revenue-gap method, seven-service sequence, canon, policy overrides, experiment loop

### Live workflow
- **Gap Audit** — read-only diagnostic that identifies the closest known measurable leak between interest and payment

## Run verification

```bash
npm run verify
```

This validates the Middleton district policy and runs the read-only Gap Audit.

## Crown & Core rooms

1. Conversion
2. Return
3. Trust
4. Nurture
5. Reception
6. Media
7. Performance

## Middleton sequence

1. Conversion
2. Reactivation
3. Reviews + referrals
4. Lead nurturing
5. Reception
6. Sales coaching
7. Paid marketing last

Crown & Core execution policy overrides source tactics where necessary. In particular, review gating is forbidden and source benchmark claims are not treated as Crown & Core facts without verification.

## Proof mode

No customer-facing action is live yet.

No:
- customer messages
- social publishing
- review requests
- ad changes
- spending
- booking changes
- clinical claims
- live credentials

## Upstream runtime

See `UPSTREAM.md`.

## Next verified slice

1. Populate `data/current-state.json` from real Crown & Core business data.
2. Run the Gap Audit.
3. Select one owner-approved leak to test.
4. Build that workflow behind an approval gate.
5. Save receipts and attributable results.
