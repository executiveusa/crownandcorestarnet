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

## Live binding preflight (GET-only)

Run this **on the existing authenticated Paperclip agent/host**, with values from the private runtime or secret manager (never add tokens to GitHub or chat):

- `PAPERCLIP_API_URL`: existing HTTPS Paperclip base URL, or operator-controlled localhost tunnel.
- `PAPERCLIP_API_KEY`: existing authorized agent token, held privately.
- `PAPERCLIP_COMPANY_ID`: existing company; never create a duplicate.
- `PAPERCLIP_INSTINCT_AGENT_ID`: existing Lethia/Instinct (Alex) agent.
- `PAPERCLIP_PROJECT_ID`: existing Crown & Core project (optional only when unambiguous).

Then run `npm run paperclip:preflight`. It performs only GETs for the exact agent, company project listing and project workspaces. It verifies the canonical repo and this review branch, returning an explicit BLOCKED reason or READY_FOR_RUNTIME_WALK_TEST. READY **does not prove** that a model ran, MCP has been registered, or the private DB is connected.

This uses Paperclip routes actually present in the installed fork: `GET /api/agents/:id`, `GET /api/companies/:companyId/projects` and `GET /api/projects/:id/workspaces`. No scheduler, credential, company, project or workspace is created or changed.

If the workspace still points to main, the new code cannot be regarded as deployed: it exists only in a draft PR pending independent review. Before production, obtain owner approval and configure the approved ref through an authorized Paperclip operator.
