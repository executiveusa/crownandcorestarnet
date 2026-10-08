# Model gateway

The model gateway is separate from computer/runtime proof.

## Verification tiers

### Structural

`CC_MODEL_PROVIDER=fixture`

Used in ordinary CI/runtime proof to verify:
- agent prompt loads;
- exact ICM scope is assembled;
- context bundle is hashed;
- task loads;
- model-provider seam returns schema-valid output;
- no external model claim is made.

Receipt:

```
verification_tier = structural
business_output_verified = false
```

### Gateway proof

`npm run runtime:mission:gateway-proof`

Every agent receives its own internal Docker network containing only:
- that agent computer;
- the Crown & Core model gateway.

The gateway uses a deterministic mock upstream in CI.

This proves:
- the agent computer can reach the gateway;
- the agent cannot use general internet egress through its own network;
- the upstream credential is not present in the agent computer;
- structured model output travels through the full gateway path;
- receipt and context hashes still verify.

Receipt:

```
verification_tier = gateway
business_output_verified = false
```

Gateway proof is not live business reasoning.

### Operational

`npm run runtime:mission:operational`

Requires on the host/gateway side only:
- `CC_UPSTREAM_MODEL_BASE_URL`
- `CC_UPSTREAM_MODEL_API_KEY`
- `CC_UPSTREAM_MODEL_ID`

The agent containers do **not** receive the upstream API key.

Operational verification requires:
- live upstream model call through the Crown & Core gateway;
- schema-valid agent analysis;
- hashed scoped context;
- deterministic domain assertions;
- artifact and receipt verification.

Receipt:

```
verification_tier = operational
business_output_verified = true
```

## Output protocol

Agents return JSON with:
- status: READY / BLOCKED / UNKNOWN
- summary
- findings with evidence refs and confidence
- unknowns
- next_action
- requires_human_approval

Unstructured model prose cannot qualify as operationally verified business output.

## Credential boundary

The upstream model credential exists only in the model-gateway container environment. Each agent gets a short-lived local gateway token.

No model credential is committed to the repository.
