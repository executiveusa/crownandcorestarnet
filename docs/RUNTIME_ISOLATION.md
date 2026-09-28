# Runtime isolation

## Requirement

Every operational district is isolated. Every agent has exactly one computer identity. No two agents share a computer workspace.

Manny is a manager, not an execution shortcut. Work is delegated to district agents.

## What "computer" means in v0.4

A computer is a distinct runtime identity with:

- unique `computer_id`
- unique agent ID
- unique district
- dedicated working directory
- dedicated HOME/TMP directories
- dedicated receipt directory
- explicit capability allowlist
- independent child process for each run

The runtime launches each agent in a separate Node child process. File operations exposed to the worker are jailed to that computer's workspace.

This is **process + workspace isolation**, proven by tests. It is not yet a hypervisor/VM security boundary. The runtime contract is designed so the backend can later be swapped to Docker, Firecracker, or a cloud-computer provider without changing district/agent identities.

## Proof law

An agent cannot report DONE by prose.

A completed run requires a receipt containing:

- run ID
- agent ID
- computer ID
- district
- process ID
- start/end timestamps
- task type
- status
- evidence records
- output file hashes where applicable

Manny and the Performance district may only count a task complete when a valid receipt exists.

## Isolation invariants

1. one agent -> one computer
2. one computer -> one workspace root
3. district agent can only write inside its workspace
4. no shared mutable workspace between agents
5. all output crossing districts must use explicit artifacts/receipts
6. live external actions remain approval-gated
7. failure, timeout, or missing receipt means NOT DONE
