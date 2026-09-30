# Runtime isolation contract

## Non-negotiable law

An agent saying **done** is not evidence.

A job is complete only when a machine-verifiable receipt proves:

- the assigned agent ran;
- on its assigned computer;
- in its assigned district;
- on its assigned task;
- with a unique runtime host;
- inside its own writable workspace;
- with only explicitly granted read inputs;
- with an artifact whose hash verifies;
- and with required policy assertions passing.

## Computer model

Production/proof computer = one ephemeral Docker container per agent.

Each container gets:

- unique container and hostname;
- unique `/computer` writable root;
- unique workspace, HOME, TMP and receipts;
- no network in proof mode;
- read-only root filesystem;
- all Linux capabilities dropped;
- no-new-privileges;
- PID, memory and CPU limits;
- read-only canonical runtime code from `_system/runtime/`, mounted at `/runtime`;
- scoped ICM input bundle at `/input`, not the whole repository.

## District isolation

`_system/runtime/scopes.json` is the capability map.

Every district receives:

1. minimal shared Crown & Core truth;
2. its own district files;
3. explicitly declared cross-district read grants;
4. only the assigned agent's prompt.

Cross-district data is denied unless listed.

Every bundle gets `SCOPE-MANIFEST.json` with file hashes. The worker checks its identity against that manifest and records the scope hash in the receipt.

## Development mode

Local-process mode exists for fast development tests.

It is not the isolation proof.

The Docker computer proof is the authority for the claim that each agent has its own isolated computer.
