# Jarvis deployment

Droplet runs as a rootless Podman stack on Jarvis. Caddy reaches its frontend,
API, PostgreSQL, Redis and Keycloak through `projects.network`. Runtime secrets
stay in `~/services/config/droplet/backend.env`; no database or API host port is
published. Public URL: https://droplet.oguzkabasakal.com.

## Measured-water release (17 October 2026)

The public app uses `/api/water/regions` and recent observation history. Gauge
levels are stored in centimeters with stable station IDs, observation times,
gauge datum and reference provenance. A published MW reference supplies the
historical-mean comparison; its period is shown. Tidal gauges without a supported
condition stay unclassified. Missing observations never become zero or synthetic
fallbacks. State names are discovery labels, not statewide water estimates.

The scheduler runs only `droplet.refresh_water_observations`, every 30 minutes
by default (`WATER_REFRESH_INTERVAL_MINUTES`). Retention defaults to 395 days
(`WATER_OBSERVATION_RETENTION_DAYS`). API startup migrates tables but never seeds
history or makes external source requests. Old score/AI/climate routes return
410; authentication configuration and `/healthz` remain available. Account
preferences are scoped to the authenticated subject. Extended history and saved
places require an account; private responses are not persisted in the browser.

## Build and verify

From an uploaded release directory (exclude `.env*`, `.git`, `node_modules`,
`dist`, virtual environments and bytecode from the upload):

```sh
podman build -f deploy/jarvis/backend.Dockerfile -t localhost/droplet-backend:RELEASE .
podman build -f deploy/jarvis/frontend.Dockerfile -t localhost/droplet-frontend:RELEASE .
podman run --rm localhost/droplet-backend:RELEASE python -m unittest discover -s backend/tests -q
```

Rehearse `python -m backend.models.water_migrations` against a separate database.
Keep the old images tagged for rollback and make a `pg_dump -Fc` backup before
resetting observations. Stop scheduler and worker before resetting data or
clearing their dedicated Redis queues. Change the backend/frontend image tags,
restart the API and worker, and run the initial measured ingestion. Start the
scheduler after verification. The new UI must ship with its matching API.

For a fresh dataset, the explicitly authorized reset clears only
`reservoir_snapshots`, `water_observations`, and `rainfall_observations`. Keep
accounts, saved places, region metadata and archived AI records. This reset is
an operator action, never an application-startup behavior.

Bootstrap current measurements and real history:

```sh
podman exec droplet-worker python -m backend.tasks.water
podman exec droplet-worker python -c 'from backend.tasks.water import backfill_water_observations; backfill_water_observations()'
```

The historical import keeps the final real observation of each hour from the
last 30 days of PEGELONLINE data, only where the current datum is documented as
valid. It imports complete daily 24-hour rainfall windows from DWD's recent
archive for up to 365 days. Missing source periods stay empty. It can be rerun:
existing observed rows are preserved. A year of gauge readings is **not**
available through this source endpoint. The retired startup seeder generated
synthetic seasonal values; it was not a historical-data download.

Verify `/healthz`, `/api/water/regions`, public `/recent`, 401 for guest `/history`
and `/places`, current station IDs and sample readings against source payloads.
Check worker logs for source failures. Thuringia intentionally has no configured
PEGELONLINE gauge near Erfurt; rainfall is available independently.

## Rollback

Before cutover, record old image IDs under `localhost/droplet-{backend,frontend}:pre-water-20261017`
and save the database dump in `~/services/backups/droplet/`. To roll back, stop
scheduler/worker/API, restore the matching backup, restore old image tags, and
restart the old stack together. A rollback restores the old computed-data
behavior; it does not reinterpret raw measurements as indices.

## Frontend runtime

The frontend root filesystem stays read-only. Its Caddyfile disables autosave
and uses `/tmp/caddy` with the Quadlet's writable tmpfs. The internal HTTP server
does not manage TLS; the outer Caddy handles TLS. Static assets have content
hashes. The app no longer restores legacy persisted browser score caches.
