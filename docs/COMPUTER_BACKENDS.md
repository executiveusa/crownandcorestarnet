# Agent computer backends

## Production direction

Each Crown & Core agent owns a persistent computer identity. The execution backend can change without changing the agent or district.

### Backend 1 — local-process

Purpose: fast deterministic development and CI.

Isolation:
- separate child process
- dedicated workspace
- dedicated HOME/TMP
- jailed writes
- receipts + artifact hashes

This is not a kernel/container boundary.

### Backend 2 — Docker

Purpose: stronger proof and deployable server runtime.

Each agent run gets:
- its own Docker container
- unique hostname/runtime host ID
- its own persistent computer directory mounted read/write
- repository mounted read-only
- container root filesystem read-only
- network disabled during proof runs
- all Linux capabilities dropped
- no-new-privileges
- PID limit
- CPU/memory limits

The Docker proof runs every registered agent and rejects completion unless its receipt verifies.

### Future backends

The same computer contract can support:
- Firecracker microVM
- cloud computer/browser
- dedicated remote VM

A future backend must pass the same receipt and isolation contract before it can replace Docker.
