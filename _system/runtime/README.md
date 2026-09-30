# Crown & Core runtime

## Commands

```bash
npm run runtime:validate
npm run runtime:prove
```

`runtime:validate` checks the topology and isolation invariants.

`runtime:prove` launches every registered agent as a separate child process, creates its dedicated workspace/HOME/TMP tree, writes a healthcheck artifact, hashes it, and produces a machine-verifiable receipt.

Generated runtime state is under `.runtime/` and is gitignored.

A successful healthcheck proves runtime identity, dedicated workspace/HOME/TMP, process launch, receipt creation, and artifact verification. It does not prove external vendor connectivity or model quality.
