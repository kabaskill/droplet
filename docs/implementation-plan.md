# Droplet implementation plan

Status: revised draft for user review. Created and revised 28 October 2026.

This is the current implementation plan. It replaces `docs/water-focused-roadmap.md`.
The [source research](environmental-data-research-2026-10-28.md) explains candidates and limitations; it is reference material, not an additional implementation checklist.

## Objective

Expand Droplet into a useful Germany-focused environmental application for everyday users and professionals, while keeping the initial experience understandable and uncluttered. Present measurements, meaningful comparisons, dates, and geographic context, with deeper exploration opened deliberately.

All three access tiers are free initially: guest, signed-in, and professional. There is no billing or monetisation work in this plan.

## Execution boundaries

- Implement and verify locally. Use Podman for containers and a local PostgreSQL/Redis/Keycloak stack. Do not use a Docker daemon or introduce a Docker requirement. Existing Dockerfile/Compose formats may be reused with Podman.
- Do not touch Jarvis during any checkpoint: no SSH, deployment, remote builds, image publication, configuration updates, service changes, or changes to `deploy/jarvis/**`. Do not use its data or credentials for local testing.
- The user separately authorized a one-time read-only Jarvis audit to repair the pre-existing Git baseline on 28 October 2026. That audit is complete and recorded in [baseline verification](baseline-verification-2026-10-28.md); it does not authorize recurring Jarvis access during implementation.
- Completing checkpoint 8 ends this local implementation plan. Any later Jarvis preparation or deployment requires a separate explicit user instruction. Completion does not trigger deployment.
- Do not push commits, create a PR, or publish anything as part of these checkpoints. Local commits are the stopping points.
- The map source and renderer are undecided. Natural Earth is not selected. The user is researching options; checkpoint 5 has an explicit decision gate.
- Preserve the existing measured-data guarantees, accounts, saved/default places, and valid stored history during the transition. Do not revive fabricated production fallbacks, AI analysis, or blended environmental/confidence scores.
- Deferred: additional state/utility integrations, climate-history/reanalysis features, CO2, billing, identity-provider replacement, and production infrastructure redesign. Existing observation history remains in scope for charts and professional use.

## Handoff and working protocol

The implementation chat should read this entire plan, applicable repository instructions, the source research follow-up, and the current code before editing. This document is a reviewed direction only after the user approves it; its existence does not authorize implementation in this planning chat.

### Local preflight before checkpoint 1

1. Inspect Git status and recent history. The Git reconciliation has preserved the verified deployed measured-water application in commit `8818801a` and merged its history into `main`. The extra `codex/water-first-foundation` branch has been removed. The expected handoff is a clean `main` containing that baseline and the subsequent planning/research commits. Verify ancestry with `git merge-base --is-ancestor 8818801a HEAD`; do not assume the older GitHub-era index implementation is the correct starting point.
2. Read [baseline verification](baseline-verification-2026-10-28.md). Jarvis's running application was the authority for the one-time reconciliation, not a deployment target. Do not repeat the remote audit or overwrite the recovered implementation from an older branch. If new uncommitted changes appear after handoff, preserve and identify them before staging checkpoint work. Do not use `git add .`, discard files, or create an all-inclusive baseline commit. Stay on local `main` unless the user requests a different branch/worktree arrangement.
3. Confirm Podman availability and the local Compose provider. `/usr/bin/podman` was found during planning; a standalone `podman-compose` executable was not. Runtime/Compose operation has not been verified. Use `podman compose` with a documented Podman-compatible provider, or an explicit Podman setup if required. Do not substitute Docker silently.
4. Use an isolated project name, local-only ports, development credentials, and dedicated local volumes. Confirm that any container connection/context is local. Keep local secrets outside Git. Never reset volumes or prune unrelated resources to obtain a clean test run.
5. Check the existing local Compose topology and development container definitions. Make only the local changes needed for this work. Record exact startup, stop, test, migration, and recovery commands once verified.
6. Run the applicable baseline frontend/backend checks and record existing failures separately. Do not claim later changes caused pre-existing failures or hide regressions behind them.

### Required checkpoint stop

For each checkpoint:

1. Complete its scoped work and acceptance checks; update relevant documentation and `CHANGELOG.md`.
2. Inspect the exact staged diff. Include only checkpoint-owned changes; preserve unrelated work.
3. Make a coherent local commit using the suggested subject or an equivalent accurate subject. Record the commit hash and verification evidence in the handoff response. A checkpoint may need smaller logical commits, but it still has a final stopping point.
4. Stop and report what changed, checks performed, remaining limitations, and the next checkpoint. Do not start the next checkpoint in the same run. Resume when the user instructs the implementation chat to continue.

Checkpoint 6 additionally stops after each source subcheckpoint. A source is complete only when integrated and verified, or explicitly deferred by the user with its impact recorded. Missing rights, sample access, or the map decision must not be disguised as successful implementation. Continue independent work where possible; report the actual remaining dependency.

For purely documentary changes, check content and links. For implementation, use meaningful tests and focused browser checks appropriate to the change. Do not repeatedly run unrelated suites after unchanged results.

## Checkpoints at a glance

| Checkpoint | Result | Suggested stopping commit |
| --- | --- | --- |
| 1 | Agreed overview/detail experience, access matrix, and evidence contracts | `docs: define environmental experience and data contracts` |
| 2 | Existing app works in English and German | `feat: add English and German localization` |
| 3 | Extensible observations, interpretation, place associations, ingestion, and caches | `feat: establish environmental data and cache foundation` |
| 4 | PEGELONLINE and DWD expansion works through the full interface | `feat: expand measured water and weather experience` |
| 5 | Reviewed map choice, city discovery, layers, and accessible tooltips | `feat: improve map discovery and environmental layers` |
| 6a | UBA air-quality integration | `feat: add measured UBA air quality` |
| 6b | Selected EEA water and bathing information | `feat: add EEA water reporting context` |
| 6c | Versioned drinking-water reporting import and update checks | `feat: add drinking water exceedance reporting` |
| 6d | UFZ drought integration where reuse is established | `feat: add documented drought context` |
| 7 | Three free tiers and useful professional exploration | `feat: add free professional exploration` |
| 8 | Local release verification and complete documentation reconciliation | `docs: reconcile environmental release and verification` |

Fixes discovered during final verification belong in appropriate separate fix commits before the checkpoint-8 stopping commit. Do not describe a local checkpoint as deployed.

## Checkpoint 1 — Define the experience and data contract

### Deliverables

- A concrete desktop/mobile place-overview proposal in English and German, plus topic-detail and professional-exploration examples. Clearly label invented sample values; they must never enter ingestion or production data.
- An initial-view information budget: selected place, one primary map topic, and approximately two or three useful findings. Define selection/ordering rules so missing or stale evidence does not become an unsupported headline.
- Each finding identifies the condition, a useful value/comparison, and place/time context. For example: below a named gauge reference and down a measured amount over a stated period. Explanations must not equate low water with universal harm.
- A capability matrix for guest, signed-in, and professional use. Keep source identity, dates, missing/stale notices, and any supported official restrictions available publicly. Plan the transition from existing signed-in history access explicitly; do not silently remove existing capabilities.
- Source records for PEGELONLINE, DWD, UBA, EEA, the supplied drinking-water report, and UFZ: selected products/fields, access route, reuse terms, expected publication cadence, actual geographic/history coverage, and outstanding questions. Select useful subsets, not every available parameter.
- A source/evidence contract separating observations, models, forecasts, annual assessments, and reported exceedances. Include stable IDs, canonical values and units, time/window/reporting year, geographic scope, quality/revision states, and source references.
- A deterministic finding contract: code, typed parameters, evidence references, interpretation version, and minimum-evidence requirements. Keep localized sentences out of domain state.
- A place model proposal distinguishing cities/discovery areas from gauges, air/weather stations, grid cells, bathing sites, and supply/reporting areas. Resolve how ambiguous or absent matches are represented.
- A decision log for open choices: map assets/renderer, professional access assignment, precise source subsets, refresh/retention policies, and existing-account capability changes. Record unresolved choices rather than inventing user approval.

### Acceptance and stop

Every proposed overview statement can be traced to sufficient evidence. Cases cover genuine zero, missing/stale data, provisional readings, model output, annual reports, and uncertain place matching. No combined environmental score or fabricated certainty appears.

Review the experience and contract with the user at this stopping point before rebuilding the interface or schema. Commit the proposal and documentation, then stop.

## Checkpoint 2 — Introduce English/German localization

### Deliverables

- Message catalogues and a shared localization boundary for the existing interface. Add a visible language choice, persistent preference, initial-language selection, and explicit fallback behavior.
- Locale-aware number, date, relative-time, unit, and plural formatting. Keep UI language separate from display timezone.
- Translate complete messages with parameters, including navigation, condition explanations, tooltips, errors, empty/loading states, charts, legends, account flows, and accessible labels. Include owned authentication screens; document externally hosted provider text separately.
- Keep numeric values and timestamps canonical in API responses. Prefer stable error/finding codes with frontend-localized messages. Retain original proper/source names where appropriate.
- Require subsequent checkpoints to add both languages as they introduce UI text.

### Acceptance and stop

Verify switching languages, reload persistence, fallback behavior, numbers/dates/plurals, keyboard/screen-reader labels, and German text expansion on desktop/mobile. Run frontend checks and inspect representative pages. Do not launch any source expansion in this checkpoint. Commit, document, and stop.

## Checkpoint 3 — Extend backend, normalization, and caching

### Starting point

The current measured-water routes assemble responses from stored observations. They do not use the retired computed-snapshot system or Redis response caching. The worker refreshes water/rainfall separately; the frontend has its own query caching/refetch behavior. Reassess this against the actual handoff tree rather than following older architectural descriptions.

### Deliverables

- Add migration-backed structures appropriate to each source family. Reuse existing measured records where sound; do not force annual reports into a high-frequency observation table or introduce a universal untyped metric store by default.
- Give source entities/series stable identities independent of discovery states. Preserve series comparability, gauge datum/reference changes, units, air averaging windows, model versions/soil depths, and dataset/reporting versions.
- Store enough original source evidence and import metadata to audit normalization, reproduce findings/exports, and handle corrections. Use idempotent imports and versioned report releases.
- Separate ingestion, validation, normalization, deterministic interpretation, persistence, and API view assembly. A place overview composes evidence with different timestamps; a build timestamp must not imply simultaneous measurements.
- Add explicit city/place-to-source relationships, with match method, geographic scope, and ambiguous/unavailable cases. Preserve saved/default-place links during identifier changes.
- Keep upstream retrieval outside interactive API requests. Run independent source-family jobs with bounded timeouts, retries/backoff, concurrency/refresh locks, and visible last-success/failure information. A failure in one topic must not discard another topic's valid data.
- Define source publication/check schedules, freshness rules, retention, history aggregation, and bounded query ranges. Do not apply the existing observation-retention setting to every future dataset indiscriminately.
- Introduce caches where useful for place overviews, map summaries, metadata, and history. Separate source retrieval/check status, evidence age, and cached-response age.
- Version API/view/interpretation contracts and invalidate or regenerate affected caches after committed source corrections, new imports, or place/rule changes. Include place, relevant query/range, versions, and access scope in cache identity. Add user identity for private content; add locale only when cached text is localized.
- Ensure age-sensitive statuses transition correctly even without new ingestion. Rebuilding a cache must not reset observation age or mark a failed update successful.
- Coordinate frontend query keys/refetch behavior with backend semantics. Preserve private-response isolation and clear user-specific queries on logout or permission changes.
- Provide lightweight local diagnostics for ingestion success, source lag, validation failures, and cache behavior. Operator diagnostics are not professional-tier benefits.
- Provide additive migration, local backup/restore, and rollback instructions. Do not delete legacy/user data as incidental cleanup.

### Acceptance and stop

Use focused tests for missing versus zero, invalid/non-finite values, timezone/window handling, provisional/revised records, station/datum changes, incompatible comparisons, partial source failure, idempotency, version invalidation, stale transitions, Redis outage, refresh concurrency, and private-data isolation. Verify local migration/restore against representative data and the current interface's compatibility.

Commit the tested foundation, documentation, and changelog entry, then stop. Do not bundle all source implementations into this checkpoint.

## Checkpoint 4 — Expand PEGELONLINE and DWD end to end

### Deliverables

- Expand verified gauge coverage and selected PEGELONLINE fields, such as discharge and documented reference comparisons where available. Forecasts/navigation products enter only if selected in checkpoint 1, with supported coverage and distinct semantics. Gauge height must never be labelled river depth.
- Add the selected DWD weather observations alongside existing rainfall. Preserve complete rainfall windows and the actual product publication cadence. Do not label forecasts or radar estimates as station measurements.
- Use the new place overview and topic-detail contracts in the interface. Show useful comparisons, short charts, source/time context, and both languages while keeping the initial information budget.
- Connect ingestion changes to targeted cache refresh/invalidation and topic-specific loading/error states.
- Keep the existing usable map until checkpoint 5; do not pre-empt the pending map choice.

### Acceptance and stop

Verify one full local journey from real source samples to persisted records, cached overview, and English/German rendering. Exercise low/high/missing/stale and mixed water/weather availability, mobile layouts, and source details. Keep automated normalization tests deterministic with recorded fixtures.

Commit, update docs/changelog, and stop for a usability review before adding more topics.

## Checkpoint 5 — Improve map and place discovery

### Decision gate

Obtain the user's map-research outcome before selecting a new asset/provider/renderer. Natural Earth is not a default or approved fallback. If no choice is available, prepare the requirements, adapter boundary, and existing-map improvements that do not depend on it; stop with the dependency visible before replacement work.

### Deliverables

- Evaluate the chosen option for suitable city/river/lake detail, coordinate/projection alignment, feature identifiers, accessibility, local operation, attribution, service limits, and asset/tile delivery. Using existing geography is expected; drawing Germany from scratch is unnecessary.
- Add city discovery and verified place/source associations. Reusing map geometry does not create environmental-data coverage.
- Support one primary environmental layer at a time, major-city labels and compact findings at national scale, and additional detail/source markers as zoom or selection warrants. Keep unavailable coverage understandable.
- Tooltips/popovers identify represented location, value/condition, relevant time, and access to details. Support keyboard focus and touch, not hover alone. Localize content and accessible names.
- Preserve selection, pan/zoom, Back navigation, and saved-place behavior. Provide a useful list/search alternative and mobile interaction.
- Keep geometry/metadata caches separate from frequently updated measurements. Prepare layer hooks for checkpoint-6 topics without inventing their values.

### Acceptance and stop

Check city selection, geographic alignment, layer changes, zoom-dependent content, tooltip focus/dismissal, mobile touch, keyboard use, color-independent meaning, and realistic marker-load performance. No single station should imply uniform conditions across a city/state. Commit with map-source and attribution documentation, then stop.

## Checkpoint 6 — Add remaining sources one at a time

Each subcheckpoint is a complete ingestion-to-interface slice, including both languages, place coverage, caches, tests, source documentation, and a changelog entry. Commit and stop after each source. Reuse the accepted presentation pattern; do not add a permanently expanded panel for every metric.

### 6a. UBA air quality

- Validate the current official API and selected pollutants. Preserve station setting/type, units, averaging windows, per-pollutant timestamps, provisional/final state, and coverage.
- Use the documented official assessment where applicable. Do not revive the old custom risk score or silently blend model output with measurements.
- Verify representative station selection and explain its scope/distance. Add the overview finding, detail chart/table, and map layer where coverage supports them.
- Check partial pollutant coverage, stale values, corrections, and station-setting differences. Stop at the air-quality commit.

### 6b. EEA water and bathing reporting

- Select a bounded useful subset of the current release; validate German record coverage and geographic identifiers before importing large archives.
- Keep samples, aggregates, water-body status, and multi-season bathing classifications distinct. Preserve release version, reporting period, detection/reporting limits, and assessment basis.
- Provide historical/reporting context. Annual bathing classifications cannot establish today's swimming permission or safety. Current restriction data requires an additional approved source and is not promised by this checkpoint.
- Check duplicate identities, revisions, censored values, missing classifications, and absent local coverage. Stop at the EEA commit.

### 6c. WasserBLIcK drinking-water reporting

- Obtain a portable source copy or documented download/import route. The locally supplied sample is `/home/flinte/Downloads/Trinkwasser.xlsx`; it must not become a hard-coded runtime dependency or an excuse to require a file under that path on other machines.
- The inspected sheet is `Überschreitungen`, with reported dimensions of 2,856 rows including headers and 20 columns. Headers/sample records indicate historical exceedance reporting. Do not present it as a complete routine water-quality dataset or interpret absence as compliance.
- Confirm field definitions, units, report types, geographic joins, and reuse rights. Preserve identifiers/leading zeroes, handle multiple municipality codes, and do not treat supply-area point coordinates as boundaries. Do not infer ambiguous volume units from the sample values.
- Implement versioned, idempotent local import and configurable scheduled upstream-update checks where access permits. Use conditional HTTP metadata when supported and content hashes for revisions. Validate changed files before promotion, retain the previous valid version on failure, and invalidate dependent caches after a successful import.
- Separate reporting year, upstream release information, last successful check, and import time. Show historical reported exceedances with parameter/count context and honest geographic coverage.
- Check duplicate imports, same-year corrections, schema changes, failed/unchanged downloads, and leading-zero/multiple-code handling. Stop at the drinking-water commit.

### 6d. UFZ drought context

- Establish reuse rights and a supported retrieval route for the actual numerical/graphical product selected. Permission for editorial/scientific graphics does not automatically establish unrestricted app/data redistribution.
- Preserve model version, reference period, averaging window, grid resolution, soil depth, and product date. Clearly identify model output.
- Explain topsoil/deeper-soil drought according to the chosen product. Do not infer groundwater levels or household supply reliability from soil moisture.
- Check spatial lookup, model-version changes, missing grid cells, date lag, and separate age/cache behavior. If access or rights remain unresolved, stop with that issue and seek an explicit deferral decision; do not substitute an unsupported scraped image or fabricated values.

## Checkpoint 7 — Introduce the free professional tier

### Deliverables

- Implement the checkpoint-1 capability matrix and the reviewed professional-access assignment approach. Keep the current identity provider. Determine whether existing accounts keep their capabilities or receive an explicitly reviewed transition.
- Enforce capabilities in backend endpoints, not just controls. Test role changes/token refresh and keep public, entitled, and user-specific caches correctly separated.
- Preserve the simple default overview for all users. Professional access opens deeper investigation rather than automatically expanding every panel.
- Add selected professional histories, bounded comparisons, parameter tables, and reproducible downloads. Include units, averaging/reporting periods, place/source IDs, quality flags, source links, extraction/version information, interpretation version, and known gaps.
- Limit queries/exports to available measured or explicitly identified model/report data. Document aggregation and comparability rules; do not promise uniform history across every source.
- No payments, subscriptions, paid entitlements, or billing dependencies.

### Acceptance and stop

Verify guest, signed-in, and professional access through direct API calls and UI flows. Check user isolation, logout/permission-change cache cleanup, existing saved places/history, bounded query/export performance, and export-to-chart consistency. Run the professional investigation journey in English and German. Commit, document, and stop.

## Checkpoint 8 — Verify the local release and reconcile documentation

### Deliverables

- Rehearse a clean local Podman setup and an upgrade from the measured-water baseline using isolated volumes. Verify migrations, retained account/place links, backup/restore, and rollback. Record exact verified commands and any baseline prerequisites.
- Complete the core journeys in English and German on desktop/mobile: find a city/place, explain its overview, inspect topic evidence, change map layers, save a place, and perform a professional investigation/export.
- Exercise source timeout, invalid update, stale evidence, missing coverage, queue/Redis/database interruptions, offline/reconnect, and permission changes. Distinguish expected degradation from failed required checks.
- Run appropriate backend/frontend checks and targeted accessibility/performance checks. Fix regressions in scoped commits; record unresolved material limitations honestly.
- Audit all documentation against actual code: root/frontend READMEs, usage, architecture, data flow, normalization, snapshot/calculation explanations, auth, production readiness, implementation notes, source licences/attribution, and local operations. Rewrite, label historical, or remove obsolete material deliberately and repair links. Do not describe retired AI/index routes as current features.
- Reconcile `CHANGELOG.md` with repository history and the existing measured-water release notes. Add missing past changes only with evidence. Preserve valid historical entries, distinguish changes later removed, and record uncertain dates explicitly rather than inventing releases.
- Document completed local checkpoints as implemented/locally verified. Do not label them deployed. Keep research proposals and unavailable/deferred data separate from delivered functionality.
- Preserve the Jarvis boundary: audit references to `deploy/jarvis/**` from other docs and record needed future reconciliation outside that directory. Do not edit its files, inspect the host, or execute its commands. Full Jarvis-specific documentation/configuration work remains a separate post-plan task.
- Produce a local release handoff with commits, checks, migration/rollback notes, accepted deferrals, source/map decisions, and known limits. Update this plan's checkpoint status as appropriate.

### Acceptance and final stop

Required checks pass or their remaining dependencies have an explicit user-approved disposition. A clean local setup and upgrade are reproducible, docs describe observed behavior, the changelog is evidence-based, and no Jarvis actions have occurred.

Make the final checkpoint commit and stop. Report that all approved local checkpoints are complete. Wait for a separate instruction before any Jarvis-related work.

## Continuous documentation and decision records

Every checkpoint updates documentation for the behavior it actually changes and adds an accurate `Unreleased` changelog entry. Do not wait until checkpoint 8 to document new source semantics, migrations, cache rules, or account behavior. Checkpoint 8 reconciles the full set and historical gaps.

Track decisions and checkpoint evidence alongside this plan during implementation. A record should identify the decision, reason, date, scope, relevant source/version, verification result, and remaining dependency. Keep secrets and personal account data out of these records.

## Suggested instruction for the implementation chat

> Review `docs/implementation-plan.md`, `docs/baseline-verification-2026-10-28.md`, and the current repository instructions and working tree. Start from the reconciled local `main`, preserving deployed baseline commit `8818801a` and subsequent planning commits. Work locally using Podman. Do not touch Jarvis or `deploy/jarvis/**`, and do not repeat the completed baseline audit. Start with the local preflight and checkpoint 1 only. Preserve any new uncommitted work. Produce the checkpoint deliverables, verify them, update the relevant docs/changelog, make a scoped local checkpoint commit, and stop for review. The map source is still undecided; do not assume Natural Earth.
