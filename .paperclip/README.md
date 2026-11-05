# Paperclip binding — Crown & Core knowledge, no new company

**State:** repository integration staged; remote Paperclip binding not verified.

Paperclip is the **only** intended work-orchestration layer for this client. It coordinates existing agent tasks/heartbeats; the repo stores client context and source-attributed knowledge. The existing StarNet runtime is not another active controller.

## Bind the existing account, not a duplicate

1. On the owner-controlled Paperclip instance, authenticate to the **existing authorized company**. Record existing company ID, current Instinct agent ID, and intended project ID in a **private operator vault**, not this public repository.
2. Attach the existing GitHub repository `https://github.com/executiveusa/crownandcorestarnet` as the workspace for the existing Crown & Core project. Paperclip supports external agent instructions pointing at a checked-out repository; the runtime host must actually have this directory.
3. Configure Lethia's **existing Instinct agent** (or a scoped delegated worker it controls) to read `AGENTS.md` and `.paperclip/INSTINCT.md` as its instructions. Preserve its present credentials, manager, reporting relationships and budget.
4. Register the repo-local MCP stdio server `node _system/knowledge/mcp-stdio.mjs` in Instinct's **supported agent runtime** or call the CLI. The MCP process must start with this checkout accessible. A public GitHub URL alone does not start a tool.
5. First read-only acceptance: ask Instinct "What do we know about Crown & Core Square booking?" Verify response cites a repo path, 2026-09-28 snapshot date and explicitly says final booking completion is unknown.
6. Verify actual Paperclip project/agent identity and run IDs, source digests, a blocked unauthorized change and an owner-visible receipt. Only then consider a timed heartbeat. Do not start a second 10-minute cron to make tests appear live.

## Reference

Paperclip docs: `https://github.com/paperclipai/paperclip-docs/blob/main/docs/guides/org/agents.md` describes external instruction folders. Paperclip's API reference is `https://github.com/paperclipai/paperclip/blob/master/skills/paperclip/references/api-reference.md`. Check the installed server's `GET /api/openapi.json` for its actual version before making a mutation.

## What this is not

- Not a deployed Paperclip company, agent or scheduler.
- Not a copy of the full client's private business database.
- Not permission to use customer data or execute marketing.
- Not a replacement for Lethia's existing Instinct identity.
