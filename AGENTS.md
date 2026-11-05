# Crown & Core — agent entrypoint

This is the canonical repository entrypoint for AI agents working on the Crown & Core business knowledge and approved operations. Read this before running any legacy StarNet task.

## Identity and intended operating model

- **Business:** Crown & Core Wellness Spa and Salon. Business-specific facts and past public evidence are in `_shared/client/`.
- **Related business:** Tangles & Locs. Do not merge customer identities, consent, analytics, systems or appointment records between the two businesses.
- **Human owner-facing agent:** Lethia's existing **Instinct** agent. Do not create a duplicate identity or manager.
- **Work orchestration:** **Paperclip**, attached to an *existing authorized company/agent*, not a second scheduling platform.
- **Existing specialist work:** `districts/` (management/Manny, conversion, return, trust, nurture, reception, media, performance, Middleton). These are task/domain definitions, not proof of active Paperclip hires or live workers.
- **Business data:** Only owner-authorized, tenant-isolated data through an authenticated provider. GitHub is a versioned **knowledge and instructions repository**, not the private customer database.
- **Legacy:** `_system/runtime/` contains prior StarNet runtime/proof machinery. Keep it for tested reference; do not run its autonomous scheduler alongside Paperclip.

## Read only what's necessary

1. `knowledge/BUSINESS_CONTEXT.md` — short business map and what is unverified.
2. `knowledge/SOURCE_REGISTER.md` — the source-of-truth hierarchy, private document locations, gaps.
3. `knowledge/ACCESS_AND_APPROVALS.md` — data boundaries and human approval rules.
4. `_shared/client/PUBLIC_TRUTH.md` + `_shared/state/current-state.json` — public evidence vs unknown measurements.
5. `.paperclip/README.md` — bind **existing** Instinct/Paperclip to this repo without new company or clock.
6. Read the matching `districts/<name>/CONTEXT.md` only for the assigned domain.

## Tool interface

From a checked-out copy, with Node.js 22+:

~~~bash
npm run knowledge:search -- "Square booking"
npm run knowledge:get -- public-truth
npm run knowledge:mcp
npm run knowledge:test
~~~

The MCP stdio server exposes `crown_knowledge_list`, `crown_knowledge_search`, and `crown_knowledge_get`. All three are **read-only public-repository sources**; the tool never fetches third-party URLs, private contracts, Supabase, Square or patient records. Responses include source paths, SHA-256 digests and provenance. No LLM training or runtime model execution occurs just by running this tool.

## Decision rules

- Separate **publicly observed facts**, **owner-approved facts**, **draft proposals** and **unknowns**. An evidence URL is not independent verification.
- Never invent services, fees, bookings, revenue, medical efficacy, approval, consent or agent run receipts.
- Patient data, health conditions, photos, media releases, contractual terms, credentials and Lethia's private information must not be committed here.
- Do not contact customers, publish, modify Square, buy ads, change prices or deploy the public website without explicit scoped human approval. For claims involving devices, health or GLP, require the designated clinical/legal review.
- Do not run a second cron, auto-hire new agents or dispatch legacy StarNet workers in parallel with Paperclip.
- Finish every task with status, source citations, artifact path, approval/consent state, actual run evidence, blocker and reversible next action.
- The repo is **public**. It does NOT contain all private business knowledge; restricted sources are only registered as references until the owner authorizes their private retrieval.

## First useful task for Instinct

Answer: "What is verified about the Crown & Core booking journey, what is unknown, and what approval is required for the next test?" Use the knowledge tool and return citations; do not book an appointment or contact a customer.

An existing authorized Paperclip deployment can be checked with `npm run paperclip:preflight`. It performs GET-only identity and workspace verification; it does not start an agent or a new scheduler.
