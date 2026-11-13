# CC-A2A-GMAIL-PUSH-001 — Event-driven Gmail ↔ Instinct receipt bridge

**Mode:** inbound, read-only; not a native A2A endpoint, Instinct API, ChatGPT conversation wake-up mechanism, or production deployment.

## Verified starting conditions (2026-11-13)

- Authorized test email was sent from `executiveusa@gmail.com` to `cityops@mail.instinct.com`.
- Correlation ID: `CC-A2A-TEST-001`.
- Gmail thread ID: `1a1d71f109f77f87`.
- Email was **sent**, not confirmed answered.
- Gmail account and sender address are project-specific. Do not reuse this adapter for other tenants/clients.
- The architecture uses **Gmail push → Pub/Sub authenticated HTTPS push → this private server → Gmail history.list → saved reply/optional OpenAI summary → signed outbound result webhook**.
- It cannot directly wake this exact ChatGPT conversation. A separate supported app notification or approved ChatGPT connector is needed. Never describe an OpenAI Responses API model call as a ChatGPT conversation notification.

## Permissions and privacy

- **Only inbound replies to explicitly registered Gmail threads** with matching mission IDs and configured sender + recipient are stored. Sender identity is **not authentication of operational instructions**. No incoming email can create a task or authorize any external action.
- Only `gmail.readonly` OAuth scope is required. This app contains **no Gmail send operations**.
- All `/v1/tasks` reads require a long random bearer token. The push endpoint verifies Google's OIDC signature, audience, sender service-account identity, subscription, mailbox and bounded JSON payload.
- State is persisted to SQLite **outside the repository**, protected by the existing Creator Studio canonical private-path guard. Keep state on encrypted private storage and back up DB with WAL consistently.
- Optional OpenAI analysis is **off by default**. It sends up to 8,000 characters of a verified, explicitly registered email reply to OpenAI Responses with `store:false`; it may still contain confidential information. Enable only after separate privacy approval and an API key in the secret manager. It cannot execute tool calls. Default review model can be configured with `CC_OPENAI_MODEL`.
- Optional notification endpoint receives **metadata only**, signed with HMAC-SHA256. It receives no email body or API keys. Failed deliveries are preserved in a local outbox and attempted again on subsequent Gmail pushes; do not promise immediate retries when no further events arrive.
- The adapter is **single process only**. SQLite records are durable locally; sharing this DB across replicas is unsupported.
- No Instinct webhook, native A2A task/status endpoint, external task submission API, or ChatGPT thread notification has been verified.

## Architecture

```text
Authorized outbound test email (already sent; human-approved)
  ↘ Instinct email replies (external, untrusted content)
Gmail INBOX watch (Gmail readonly OAuth)
  → Google-managed Pub/Sub topic
  → Authenticated Pub/Sub push subscription (OIDC JWT)
  → HTTPS TLS proxy → 127.0.0.1:8918/internal/pubsub
  → Gmail users.history.list (cursor persisted; 404 fails closed)
  → Gmail messages.get (only registered thread, mission, sender, recipient)
  → Private SQLite inbound receipt (unique Gmail message ID)
  → Optional read-only OpenAI review (explicit opt-in)
  → Optional HMAC signed notification webhook (outbox)
  → GET /v1/tasks/:mission_id (private bearer token)
```

## Deployment prerequisite: owner-controlled infrastructure

Deploy with Node **24** on an existing private Coolify/VPS or approved Cloud Run service; expose only an authenticated TLS reverse-proxied webhook. Prefer private network for `/v1/tasks`. No resources are provisioned by this PR.

Google Cloud setup is a separate owner/operator action:

1. Select an owner-controlled Google Cloud project. Enable **Gmail API** and **Pub/Sub API** and configure OAuth consent for the Gmail account. Obtain offline refresh credentials for `https://www.googleapis.com/auth/gmail.readonly` only.
2. Create a Pub/Sub topic in the same Google Cloud project used for Gmail API watch. Grant `roles/pubsub.publisher` on the topic to `gmail-api-push@system.gserviceaccount.com`.
3. Create a **different user-managed push service account** with permission to sign authenticated push requests. Grant the Pub/Sub service agent authority to mint identity tokens and allow the push account to invoke the HTTPS service. Configure push subscription to `https://YOUR-APPROVED-DOMAIN/internal/pubsub` with OIDC auth, with exact `CC_PUBSUB_AUDIENCE` and `CC_PUBSUB_SERVICE_ACCOUNT`. Don't expose unguarded endpoints.
4. Store all secret values in the server's secrets manager; never place credentials into issue comments, code or this chat. Place `CC_BRIDGE_DB_FILE` outside the repository, on a private writable volume. Set token and notification keys to independently generated random values (at least 32 characters).
5. Initialize the watch and approve mission mapping using the CLI:
   ```bash
   node _system/integrations/instinct-gmail-push/src/cli.mjs watch
   node _system/integrations/instinct-gmail-push/src/cli.mjs register CC-A2A-TEST-001 1a1d71f109f77f87
   node _system/integrations/instinct-gmail-push/src/cli.mjs bootstrap CC-A2A-TEST-001
   node _system/integrations/instinct-gmail-push/src/cli.mjs status
   ```
   **Order matters:** issue `watch` before `bootstrap` so future changes are tracked; bootstrap fetches any reply already in the approved thread.
6. Launch `node _system/integrations/instinct-gmail-push/src/server.mjs`. Default host is `127.0.0.1`, port `8918`. For containers you may set `HOST=0.0.0.0` only inside a private container network behind the authenticated HTTPS proxy.
7. Run `watch` again daily to renew Gmail watch (watch expires within seven days). This is **renewal only**, not polling for email. Never reset an existing lower Gmail history cursor during renewal.
8. Negative-test forged JWTs, wrong audience, wrong sender, wrong subscription, unknown threads, duplicate Pub/Sub notifications, a replayed Gmail message and duplicate mission registration. Do not enable notification delivery until the destination can verify the HMAC signature and deduplicate by `x-cc-event-id`.

Google's push system sends an **initial notification immediately on watch creation**. If the webhook is up before initialization it may return an error until a history cursor is saved. Pub/Sub retry should deliver the event again. The operator must reconcile message history before acknowledging successful setup.

## Environment variable inventory

See `.env.example` for names only. Minimum:

```text
CC_BRIDGE_DB_FILE
CC_GMAIL_CLIENT_ID
CC_GMAIL_CLIENT_SECRET
CC_GMAIL_REFRESH_TOKEN
CC_GMAIL_MAILBOX
CC_INSTINCT_SENDER
CC_PUBSUB_TOPIC
CC_PUBSUB_SUBSCRIPTION
CC_PUBSUB_AUDIENCE
CC_PUBSUB_SERVICE_ACCOUNT
CC_BRIDGE_READ_TOKEN
```

Optional notification: `CC_RESULT_WEBHOOK_URL`, `CC_RESULT_WEBHOOK_SECRET`.
Optional model: `CC_OPENAI_REVIEW_ENABLED=yes`, `OPENAI_API_KEY`, `CC_OPENAI_MODEL`.

## API (read-only)

- `GET /health` — status flag only, no identity or private message contents.
- `POST /internal/pubsub` — Google-signed Pub/Sub push only; no body-based owner commands.
- `GET /v1/tasks` — long bearer read token required.
- `GET /v1/tasks/CC-A2A-TEST-001` — returns the saved, untrusted reply and optional summary; requires read token.

No write-capable A2A protocol surface, tools/call, shell, social media, spending or publication endpoints exist here.

## Proof and acceptance criteria

```text
[ ] Offline Node 24 bridge tests pass in PR
[ ] Independent code review complete; security findings resolved
[ ] Owner-controlled Google Cloud project selected
[ ] OAuth gmail.readonly refresh credential configured privately
[ ] Gmail watch returned actual historyId + expiration
[ ] Authenticated Pub/Sub push successfully delivered
[ ] Gmail message verified by exact mission/thread/sender/recipient
[ ] CC-A2A-TEST-001 real inbound result persisted
[ ] Duplicate and forged deliveries rejected or deduplicated
[ ] Optional notification arrived at authorized receiver, HMAC verified
[ ] Optional model review privacy approved and exercised
[ ] ChatGPT connector can read actual receipt (separate integration)
[ ] Actual production health, audit, restore and rollback verified
```

## Recovery and rollback

- Stop receiver, revoke OAuth refresh token if compromised, disable Pub/Sub push subscription and Gmail watch, invalidate all bridge tokens, disable optional notification destination.
- Preserve private inbound receipts for approved retention duration; do not delete evidence on rollback.
- Revert the isolated PR and restore the prior approved deployment. No schema migrations to existing StarNet/Creator databases.
- On Gmail history 404, **do not silently reset cursor**. Stop and manually reconcile the registered thread via `bootstrap`, then explicitly reinitialize the watch and cursor under operator review. `watch` purposely refuses to overwrite an existing cursor.
- Keep OpenAI analysis and notification webhooks disabled until explicitly configured, and treat all email content as untrusted.

Official docs:
- https://developers.google.com/workspace/gmail/api/guides/push
- https://developers.google.com/workspace/gmail/api/reference/rest/v1/users/watch
- https://cloud.google.com/pubsub/docs/authenticate-push-subscriptions
