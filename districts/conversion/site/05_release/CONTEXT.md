# 05_release — publish verified work

One job: release an approved, verified build and preserve rollback evidence.

## Inputs
- `../04_verify/output/release-decision.md`
- approved build from `../product/`
- deployment contract from the verified runtime/hosting system

## Process
1. Confirm approval requirements are satisfied.
2. Build/deploy using the existing authorized release mechanism.
3. Smoke-test production.
4. Record commit, deployment, route checks, and rollback target.
5. If production fails health checks, rollback.

## Outputs
- `output/release.md`

## Human check
Production release requires the declared owner approval.

## Do NOT load
Design references or rewrite the site during release.
