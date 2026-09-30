# Receipt law

## Completion state machine

```
QUEUED
-> RUNNING
-> RECEIPT PRODUCED
-> RECEIPT VERIFIED
-> VERIFIED
```

There is no transition from agent prose directly to VERIFIED.

## Fail closed

A job is not done when:

- the process exits without a receipt;
- the receipt says failed;
- the agent/computer/district mapping does not match registry;
- the task does not match the agent's assignment;
- evidence is missing;
- an artifact is missing;
- an artifact hash differs;
- timestamps are invalid;
- the isolation probe is missing;
- the domain assertion is missing.

Manny may summarize a failure, but may not rename it success.
