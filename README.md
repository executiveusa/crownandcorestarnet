# Crown & Core Operations

Client-specific operating system for Crown & Core.

This repository is the Crown & Core layer. It uses the open-source runtime from `androoAGI/starnet` as an upstream engineering base, but it is not distributed as StarNet and does not reuse upstream branding/artwork.

## Phase 1 status

Current slice: **read-only Gap Audit**

Goal: identify the closest measurable leak between interest and payment before adding more traffic.

### Run locally

```bash
npm run gap:audit
```

The audit reads `data/current-state.json` and writes a report to `outbox/GAP-AUDIT.md`.

No customer message, social post, review request, booking change, ad change, or external business action is performed in this phase.

## Operating model

Manny is the manager. He prioritizes business leaks, assigns work, requests approval, and reports measurable results.

Rooms:

1. Conversion
2. Return
3. Trust
4. Nurture
5. Reception
6. Media
7. Performance

Paid media is downstream of conversion, follow-up, trust, and measurement.

## Upstream runtime

See `UPSTREAM.md`.

## Next verified slice

1. Populate the current-state file from real Crown & Core data.
2. Run the Gap Audit.
3. Confirm the highest-value leak with the owner.
4. Build only the approved workflow for that leak.
