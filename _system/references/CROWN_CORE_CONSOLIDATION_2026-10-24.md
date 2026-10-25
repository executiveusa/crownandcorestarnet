# Consolidation gate — Crown & Core STARNet
Checked: 2026-10-24. Integration branch: `integration/crown-core-commercial-organic-2026-10-24`.
**Status: governed consolidation, not a live commercial deployment.** This is one STARNet integration PR. GitHub cannot combine changes from other repositories into its commit graph without a deliberate, separately tested import.

## Source truth and branch audit
- Current STARNet `main`: commit `b303d762f2c1bde625ca0856ffbe600cdbe7d18d` (2026-10-08), v2.0 ICM architecture + phased mission and merged Square truth-intake work; public repository.
- No open PRs in `executiveusa/crownandcorestarnet` as checked 2026-10-24. 23 historical feature branches were compared against `main`. `build/control-plane` and `build/v1.5-square-truth-intake` are fully behind; the other inspected branches are divergent. Divergence **does not** authorize blind merging, since `main` already has superseding copies of many features. `build/v2.1-commercial-studio` returns 404 (not pushed).
- Additional `executiveusa/executiveusa-crown-core-growth-system`: **private**, no open PRs; its `feat/tshape2-research-and-import` branch was 155 commits ahead of its own `main` with different landing/organic/operator application sources. Do not merge it wholesale into STARNet or claim it runs here.
- `executiveusa/Synthia-2026-4.0`: W7 commercial workflow has been committed/merged separately, with anti-slop and two spend gates. Reference its contracts instead of copying code blindly. Source: https://github.com/executiveusa/Synthia-2026-4.0/commit/4dd76788e0a2404ad442debf4dfc0f1b9c27ed09
- `executiveusa/pauli-montage-video-agent`: open PRs #62 (vendor + es-MX), #63 (status endpoint), #72 (local editing). These belong to **Montage**, not STARNet; cross-repo PRs cannot be turned into this PR. Depend on stable released interfaces after their respective QA and approvals.
- `executiveusa/macsdigitalmedia`: open PRs #50, #57, #58, #59 (ICM docs, dependency updates and agent map); none should be cherry-picked into client STARNet.
- `executiveusa/brand-kit-builder-`: outstanding dependency PRs, separate product. PARÉ Postiz approval idea can inform a future adapter but is not running here.
- `executiveusa/macs-agent-portal`: separate service/agent portal with outstanding dependency and architecture PRs; not a source of patient-data authorization.
- Claude shared snapshot: https://claude.ai/share/0e9891bb-fe5c-4672-bb9b-2ad53e31d142 (snapshot last message 2026-10-24T20:34Z). The author described a `/tmp/sn` Commercial Studio implementation: 65 sound candidates, Openverse/Clipwing/Earshot workflows, sound-reasoner and UI, but explicitly stated code was **uncommitted/unpushed**. Treat its **existence in GitHub as NOT VERIFIED**, its unit/browser results as author-reported, and its 55 external audio licenses as NOT independently cleared.
- User explicitly told Claude to ignore a separate older prompt and continue the commit-and-handoff task. Do not mistake the superseded prompt as active product scope.

## Validated baseline
- A fresh public STARNet `main` checkout `b303d76` was used for read-only source inspection and direct Node execution (2026-10-24).
- Direct execution of 16 of the top-level verify subprocesses returned success; the final `npm test` alias was unavailable because the isolated remote tool environment had Node but no npm binary. Running `node _system/tests/verify.mjs` directly returned exit 0. **This is not an `npm run verify` invocation and not a Docker CI pass.**
- The existing proof reports `STRUCTURAL_ONLY` for orchestrated missions. It does not prove live AI agents serving customers.
- Do not modify generated `output/` or `outbox/` artifacts for this integration; do not commit transient proof results.

## Consolidated source hierarchy
1. **Crown & Core STARNet**: single approval/orchestration control plane; 17 existing agents and isolated computers. Preserve canonical `_system/` and `districts/`; no parallel orchestrator.
2. **Growth-system private repo**: approved service-landing and organic strategy source provider ONLY. Reuse via explicitly authorized APIs/manifests; no medical or customer record syncing.
3. **Synthia W7**: commercial process and human-quality review methodology, separate reusable rule set; avoid duplicate engines.
4. **Montage / HyperFrames / Remotion**: rendering workers. Use one selected renderer per job; do not fork renderer code into STARNet. No replacement of Montage's existing split hero.
5. **Openverse / Clipwing Real SFX / Earshot / fal.ai**: external providers for discovery, timing, audio critique and optional generation. Source package and version, license, network/secret scopes, cost and executable-code review required. “Licensed” is not a blanket clearance for each Openverse item.
6. **Tangles & Locs**: related business but separate tenant, credentials, customer permissions, marketing and appointment statistics. Do not imply a shared customer database or consent.
7. **Distribution**: Google Business Profile, Square booking, own site, approval-gated organic social. Media buy target: $0. Hosting and production costs remain visible.

## Adopted 80/20 production queue
1. Finish existing 30-second Crown & Core **private** brand film and 15-second cut from the supplied edit/source material. Genuine storefront, founder and service imagery; no clinical promises; include human listening QA.
2. Shoot authentic Lethia founder interview; create one main film and a few independent informational clips, not generic volume.
3. T-Shape 2 educational service explainer only after clinical claim-ledger review and exact Square service/link verification.
4. Publish optimized Google business information and useful content after owner/platform approvals, measure actual booking-to-attendance rather than vanity views.
5. Create Tangles & Locs service and craftsmanship films under **its own** brand and authorization when it is onboarded.

## Claude Commercial Studio material not merged
Unrecoverable from GitHub as of this review: the reported 65-entry media manifest and media bytes, audio-selection code, FFmpeg renderer, SFX UI, Openverse verification tool, custom plugin and tests. Need the exact commit/ZIP/patch from Claude's `/tmp/sn`, with file list and SHA, before integration. Do not silently rebuild or imply those files are in this PR.

Required independent checks on receipt:
- `PLAYBOOK.md` and `SOURCES.md` are real and referenced paths resolve.
- No more than two intentional overlapping effects for the sampled cue windows at 7.8–8.5 and 11.8–12.5 seconds; never erase artistic exceptions without human review.
- A defined target-loudness option and measured integrated LUFS/true peak; source author's example reported −29.3 LUFS and −16.3 dBFS peak, **not yet listening-approved**.
- Rights evidence for every selected audio file and actual listening of each sonic-logo candidate; rejected or unknown license items stay out of published renders.
- Openverse request/pagination/error handling and data-source pinning, including reported HTTP 403 failure; cache with attribution as required.
- Exact cue synchronization and audio output integrity, deterministic repro, real human browser UI QA, full `npm run verify` and Docker CI on GitHub PR HEAD.

## Non-negotiable boundaries / release
- This PR must not publish a clinical statement, import patient data, enable customer outreach, pay for ads, trigger production deployment, access unknown plugin secrets or alter Square.
- Require licensed clinician for device claims, Lethia/authorized brand owner for design and offers, privacy counsel for Washington consumer health data, publisher for final release.
- All publishing actions must be authenticated, least-privileged and explicitly human-approved. Claims and rights approvals are version-scoped, never implied.
- Keep `main` the verified structural baseline until PR checks and owner signoff. Opening a draft PR is not a client launch authorization.
- Mergeability = code graph conflict-free **at the moment GitHub checks**, not future guarantee, CI pass, or publishing approval.

## Merge / rollback plan
- Single PR from a clean branch based on STARNet `main`, with only additive reference/hand-off work and the smallest producer-prompt routing update.
- Readback and CI on the PR head; human review of this document's intent. Do NOT merge any unrecovered Claude source on inference.
- No other repository PRs are closed or merged in this action. Revert this PR's merge commit if a later contract issue appears.
- Future authenticated and audited Sound Studio source should be added **to this same PR** for consolidated review, with code and tests clearly separated from this reference-only checkpoint.

## Owner's superseding production decision — 2026-10-24
The owner explicitly **deferred the separate Sound Studio**. Its recovery, SFX catalog, cue editor, audio mixer, Openverse/Earshot integration, sound-specific tests and Claude's unfinished local implementation are **no longer blockers** to Crown & Core video production. Do not create a new audio application.
Use the owned [Motion Master](https://github.com/executiveusa/motionmaster) and [Montage / YAPPY-CLIPZ](https://github.com/executiveusa/pauli-montage-video-agent) as external workers through verified, authorized API/CLI/MCP interfaces. Motion Master's [Montage bridge](https://github.com/executiveusa/motionmaster/blob/main/bridge/README.md) already documents HTTP read calls and MCP timeline tools; bridge license is AGPL-3.0, so keep it as an independent service, not vendored source.
Current action is to validate one live external endpoint and produce an authentic private brand-film draft; include audio only if the selected worker supports it and rights are cleared. The previous audit above remains historical evidence, not the updated build priority. See [the current media production contract](../../districts/media/references/COMMERCIAL_STUDIO_CONTRACT.md) and [the machine handoff](CROWN_CORE_COMMERCIAL_HANDOFF.json).
