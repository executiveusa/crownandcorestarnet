# Approval Gate

Generic policy gate for external actions.

## Example

```bash
node workflows/approval-gate/index.mjs --input=schemas/action-request.example.json
```

Exit codes:
- `0`: allowed by current local policy
- `2`: blocked by policy/approval state

An ALLOW result means the local policy gate passed. It does not prove a connector is configured or that an external action was executed.
