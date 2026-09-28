# Gap Audit

Read-only diagnostic workflow.

## Purpose

Map the customer path and rank known leaks by proximity to payment.

## Path

```
DISCOVERY
-> WEBSITE
-> INQUIRY
-> RESPONSE
-> BOOKING
-> SHOW
-> PURCHASE
-> RETURN
-> REVIEW
-> REFERRAL
```

## Current behavior

Input: `data/current-state.json`

Output: `outbox/GAP-AUDIT.md`

The workflow does not call external services and does not modify business systems.

## Next integration

After real data is loaded, the highest-value leak becomes a candidate for a separate approval-gated workflow.
