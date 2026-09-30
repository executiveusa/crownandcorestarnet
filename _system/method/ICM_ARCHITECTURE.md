# ICM architecture authority

Source: uploaded `icm-architect-main` package.

This file is the local architecture contract extracted from that source. It does not replace the source package; it records the invariants Crown & Core StarNet must enforce.

## Ten invariants

1. One folder, one job.
2. Root `CLAUDE.md` is a small stable router, not a content store.
3. Numbered folders encode order where sequence matters.
4. Every working folder has an explicit `CONTEXT.md`: inputs, process, outputs, human check.
5. Factory and product are structurally separate.
6. Every intermediate output is a plain-file human edit surface.
7. Load only what the step needs.
8. Plain text + frontmatter + links; one home per fact.
9. The filesystem is the state machine.
10. New repeatable units are instantiated by copying templates.

## Crown & Core form

Crown & Core composes:
- **Umbrella** — distinct districts under one business/system identity.
- **Context map** — districts, data, agents, processes, and handoffs form a graph.
- **Pipeline stages** — only inside districts where a real sequence exists.

## Runtime exception

The source method explicitly notes that real-time multi-agent collaboration and high-concurrency serving can require framework code.

Crown & Core therefore keeps the isolated Docker/agent runtime for execution while ICM owns:
- human-readable architecture;
- routing;
- context scoping;
- factory/product separation;
- output/state surfaces;
- human gates.

## Walk test

A valid workspace must let a cold agent:
- identify where it is and where to go within the root router plus at most two reads;
- open any stage and see exact inputs, job, output, and human check;
- infer state from output surfaces/receipts;
- avoid routing files that carry payload;
- find each fact in one canonical home;
- load roughly one contract plus only the inputs needed for the task.

If a walk test fails, fix the structure rather than adding explanatory prose.
