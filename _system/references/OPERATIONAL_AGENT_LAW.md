# Operational Agent Law

## Two different claims

Crown & Core StarNet distinguishes:

1. **Structural verification** — the correct agent, district, computer, task, scope, artifact, and receipt ran successfully.
2. **Operational business verification** — an external/live model produced schema-valid task analysis from the agent's scoped context and the business artifact passed the relevant domain and receipt checks.

A fixture model can prove the runtime path. It cannot prove that an AI agent performed live business reasoning.

## Receipt fields

Every agent receipt records a verification tier:

- `structural` — fixture/non-external model or otherwise non-operational analysis.
- `operational` — external model call plus valid structured agent analysis.

## Completion rule

A runtime test may close with structural verification.

A business stage that depends on AI analysis may not be called operationally complete until:

- the model run is external/live;
- the model response passes the agent-analysis schema;
- the exact context bundle hash is recorded;
- deterministic domain assertions pass;
- artifact and receipt hashes verify;
- any required human gate is satisfied.

## Context law

The model receives the district's explicit ICM scope, not a generic global context block.

The context bundle is hashed and listed in the artifact so later verification can prove what evidence the model actually received.
