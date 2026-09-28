# Middleton experiment loop

Purpose: test the method against **Crown & Core's actual data**, not assumptions.

## Cycle

1. **OBSERVE** — collect verified state.
2. **PROPOSE** — create one experiment card.
3. **APPROVE** — owner approves audience, action, copy, spend, and success metric.
4. **RUN** — execute the smallest useful test.
5. **RECEIPT** — save evidence.
6. **MEASURE** — compare against baseline.
7. **DECIDE** — adopt, adjust, or kill.

## Experiment card

```json
{
  "id": "CC-EXP-0001",
  "problem": "",
  "evidence": [],
  "canon_reference": [],
  "hypothesis": "",
  "audience": "",
  "action": "",
  "approval_required": true,
  "approved_by": null,
  "cost_ceiling": 0,
  "success_metric": "",
  "stop_condition": "",
  "rollback": "",
  "status": "DRAFT",
  "receipts": []
}
```

## Initial queue

- Gap audit from real business data
- Dormant-customer reactivation on an approved segment
- Missed inquiry / missed call recovery
- No-show recovery
- Feedback + optional honest review flow
- Founder/expert content to service-specific booking path
- Paid distribution only after earlier gates pass
