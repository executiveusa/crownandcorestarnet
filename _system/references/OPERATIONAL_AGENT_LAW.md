# Operational Agent Law

## Two different claims

Crown & Core StarNet distinguishes:

1. **Structural verification** — the correct agent, district, computer, task, scope, artifact, and receipt ran successfully.
2. **Operational business verification** — an external/live model produced schema-valid task analysis from the agent's scoped context and the business artifact passed the relevant domain and receipt checks.

A fixture model can prove the runtime path. It cannot prove that an AI agent performed live business reasoning.

## Receipt fields

Every agent receipt records a verification tier:

- `structural` — fixture/non-external model or otherwise non-operational analysis.
- `gateway` — isolated agent reached a model gateway and received schema-valid output, but the upstream is not trusted as live business reasoning.\n- `operational` — live trusted upstream model call plus valid structured agent analysis.

## Completion rule

A runtime test may close with structural verification. A model-network test may close with gateway verification.

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


## Network law

Operational Docker agents do not receive upstream model credentials and do not get general internet access.

Each agent receives its own ephemeral **internal Docker network** containing only:
- that agent computer;
- the Crown & Core model gateway.

The model gateway holds the upstream credential separately and is the only bridge to the upstream model provider.

A deterministic mock upstream may prove the gateway/network path, but those receipts are tier `gateway` and set `business_output_verified=false`.
