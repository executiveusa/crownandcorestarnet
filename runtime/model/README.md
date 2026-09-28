# Model gateway

The model gateway is separate from computer/runtime proof.

## Proof provider

`CC_MODEL_PROVIDER=fixture`

Used in CI to prove:
- agent prompt loads
- task loads
- context assembly works
- model-provider seam returns a result
- no external network/model claim is made

## Live provider

`CC_MODEL_PROVIDER=http-compatible`

Requires:
- `CC_MODEL_BASE_URL`
- `CC_MODEL_API_KEY`
- `CC_MODEL_ID`

The live provider is not considered verified until an authenticated smoke run produces a receipt.

No model credential is committed to the repository.
