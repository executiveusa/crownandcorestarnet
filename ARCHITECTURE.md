# Architecture

## Independence

Crown & Core StarNet is an independent build. It does not depend on Pauli StarNet.

The upstream engineering reference is `androoAGI/starnet`, but Crown & Core owns its own configuration, agents, workflows, approvals, data contracts, schedules, integrations, and reporting.

## Control plane

Manny is the manager. Rooms are bounded capabilities. External actions pass through the approval gate.

```
INPUTS -> MANNY -> ROOM -> DRAFT -> APPROVAL GATE -> CONNECTOR -> RECEIPT -> REPORT
```

## Rooms

- Conversion
- Return
- Trust
- Nurture
- Reception
- Media
- Performance

## Shared local districts

- Middleton: method canon + policy-aware experiment patterns

## Data boundaries

- `data/` contains non-secret operating state and templates.
- Live credentials belong outside git.
- `outbox/` is generated output and ignored.
- Receipts should be durable and append-only once live connectors exist.

## Truth hierarchy

1. Owner approval
2. Crown & Core policy
3. Verified Crown & Core facts
4. Verified live data
5. Source canon
6. Hypotheses/experiments
