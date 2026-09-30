# Model gateway

The model gateway is separate from computer/runtime proof.

## Verification tiers

### Structural

`CC_MODEL_PROVIDER=fixture`

Used in CI to prove:
- agent prompt loads;
- exact ICM scope is assembled;
- context bundle is hashed;
- task loads;
- model-provider seam returns schema-valid output;
- no external model claim is made.

A structural receipt has:

```
verification_tier = structural
business_output_verified = false
```

### Operational

`CC_MODEL_PROVIDER=http-compatible`

Requires:
- `CC_MODEL_BASE_URL`
- `CC_MODEL_API_KEY`
- `CC_MODEL_ID`

Operational verification requires:
- an external/live model call;
- schema-valid agent analysis;
- hashed scoped context;
- deterministic domain assertions;
- artifact and receipt verification.

A successful operational receipt has:

```
verification_tier = operational
business_output_verified = true
```

## Output protocol

Live agents must return JSON with:

- status: READY / BLOCKED / UNKNOWN
- summary
- findings with evidence refs and confidence
- unknowns
- next_action
- requires_human_approval

The runtime parses this output. Unstructured model prose cannot qualify as operationally verified business output.

## Network note

The current hardened Docker proof uses `--network none`, so it proves isolated computers with the fixture model.

Live external-model execution requires a separately approved model-gateway network path. Until that path is configured and proven, Docker mission receipts are structural-only.

No model credential is committed to the repository.
