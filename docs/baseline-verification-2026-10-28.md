# Deployed baseline verification — 28 October 2026

This is a completed one-time Git reconciliation, not an implementation checkpoint or deployment runbook. The user identified the version running on Jarvis as authoritative and authorized read-only inspection to resolve the local/GitHub discrepancy.

## Finding

Before repair:

- GitHub advertised only `main`, at `0a67fb8d7b0dbb5e9ce231fbe3bc205393b8ec46`.
- Local `main` pointed to the same old commit.
- Local `codex/water-first-foundation` contained one additional planning commit, `fdd46adc`, and extensive uncommitted measured-water application changes.
- The measured-water application had been deployed to Jarvis on 17 October but had not been recorded in Git. The new research/implementation-plan documents were separate, later local changes.

## Read-only deployment evidence

The running backend, worker, and scheduler used image:

`b52959c3f0217a7d88379f99cf33b00196dfe27b2c58ac2bcc0c3a686f4cfac8`

It was built on 17 October 2026 and carried `localhost/droplet-backend:water-20261017` and `latest` tags at inspection time.

The running frontend used image:

`733cb1fcd1453e820566fad935e0c6eb767a5f8281a901f5a98b708a0cdca8ef`

It was built on 17 October 2026 and carried `localhost/droplet-frontend:water-ui-20261017` and `latest` tags at inspection time. Neither application container had a bind-mounted source override.

Comparison results:

- All 61 non-generated backend application files in the running container matched the uploaded release source under `/home/jarvis/services/releases/droplet-water-20261017` by SHA-256.
- Of 158 compared release files, 157 matched the local working tree directly. The remaining file, `README.md`, matched after excluding the later implementation-plan/research paragraph.
- A local frontend production rebuild using the documented deployment environment matched all 10 files under the running frontend's `/srv` byte-for-byte. The previously existing local development build differed because its environment was different; it was not used as the baseline authority.
- Frontend type checking and lint passed using the installed local tool executables. The normal `bun` launcher attempted a network-dependent package-manager resolution, so the existing TypeScript/ESLint executables were invoked directly instead.
- Backend unit tests were not rerun during this Git-only reconciliation because the local default Python lacked the required dependencies. No new application code was introduced. The implementation preflight still needs the documented local Podman verification.

No services were restarted, images rebuilt remotely, databases queried or changed, secrets copied, or remote files modified. Source/asset hash manifests used for comparison were saved temporarily on the local machine only.

## Reconciliation

Commit `8818801a` (`fix: record verified deployed measured-water baseline`) records the recovered application, existing local/deployment definitions, measured-water release notes, and the previously missing 17 October changelog entry. Committing the existing deployment files records already-deployed source; it does not modify Jarvis.

The later plan/research changes are a separate documentation commit. The complete history has been fast-forwarded into local `main`, and the redundant local `codex/water-first-foundation` branch was deleted after its commits were preserved. The user separately authorized an ordinary fast-forward push of the recovered release and revised plan to GitHub `main` on 28 October 2026. No history rewrite or remote branch deletion is needed; no extra remote branches were advertised.

Future implementation starts from this reconciled `main`. The [implementation plan](implementation-plan.md) continues to require local Podman work and excludes Jarvis access throughout its checkpoints. This audit should not be repeated as routine preflight.
