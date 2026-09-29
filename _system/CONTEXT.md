---
type: context
job: system-factory
---

# _system

## Job

Hold the stable execution factory: runtime, permissions, schemas, schedules, integration contracts, templates, verification code, and reusable method rules.

## Reads

- Root `CONTEXT.md`
- Stable system rules only

## Writes

System code and contracts. Never business-run outputs.

## Human check

Any change that alters permissions, isolation, approval rules, or external-action behavior requires review before merge.

## Migration sources

- `runtime/`
- `config/`
- `integrations/`
- `schemas/`
- `schedules/`
- `scripts/`
- `lib/`
- `test/`
- system-only workflows
