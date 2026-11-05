# Instinct / Paperclip — permissions and data contract

## Read path (present)

Any locally running AI agent can start `node _system/knowledge/mcp-stdio.mjs`, use the three `crown_knowledge_*` MCP tools or invoke the CLI commands documented in `AGENTS.md`. The interface is read-only, deterministic, source allowlisted, file bounded and network-free. Source paths, historical dates and SHA-256 digests are returned for inspectability.

This read path is not an LLM, does not use Supabase, and does not provide private customer records.

## Private database path (not yet activated)

The intended flow is:

Lethia → authorized existing Instinct identity → Paperclip task or direct approved agent tool → owner-approved authentication/tenant layer → Crown & Core **scoped** record query → minimal answer with a retrieval receipt.

Required before enabling:
- Confirm the **actual owner-controlled** Crown & Core/Supabase project; never substitute a connected unrelated project.
- Establish separate Crown & Core and Tangles & Locs tenancy and membership.
- Define permitted read views for business operations. **Never expose service-role credentials or raw patient/health records to an agent.**
- Confirm source-by-source authorization and consent, applicable Washington privacy obligations and retention.
- Prove row-level security with two real tenant identities, failed cross-tenant reads and time-scoped revocation.
- Log actor, purpose, query boundary, source version, response minimization and cost.
- Identify an authorized private document store; GitHub public repository is not it.

No database schema or migration is included because the correct project/schema is not accessible and cannot be safely guessed.

## Human approval boundaries

Lethia or authorized business owner approval is required for customer messaging, appointment changes, public website changes, publication, pricing, spending, campaigns and rights-restricted media.

Separate clinician and legal authorization is required for regulated health/device/GLP statements and sensitive-health processing. Source content or an AI-generated draft is **not** approval. Record exact artifact revision, approver, expiry, permission scope and rollback before acting.

An agent may summarize and propose; it may not self-approve. If permissions or evidence are missing, respond `BLOCKED` with the missing requirement and no external side effects.

## Control plane

Paperclip owns task dispatch, model heartbeat and task receipts. Existing in-repo `_system/runtime` remains historical proof and must not be scheduled concurrently. Instinct is the owner-facing callable agent; Manny is a historical management **domain** and role prompt, not a second autonomous CEO. Bind to existing identities and keep a single scheduler. No Paperclip runtime or scheduled execution is proven by repository files.

## Release

All changes remain on a draft PR until independent review and owner signoff. To roll back, close the PR or revert its merge; no database records are modified by this change.
