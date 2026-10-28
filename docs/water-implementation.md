# Measured-water release

The 17 October 2026 release replaces the legacy index dashboard with named
water gauges, raw centimeters, source conditions, changes over approximately
24 hours, and complete observed rainfall windows. State boundaries are neutral;
markers identify actual gauges. Published historical means include their source
period rather than implying a seasonal or statewide average.

Implemented: migration-backed observations, verified station UUIDs, independent
water/rainfall failure handling, public current/recent history, authenticated
extended history, saved/default places, mobile list/map views, source details,
and removal of production score/demo/AI/climate paths. Existing account identity
is preserved. Legacy backend modules remain only as unused reference code;
production routes and Celery includes do not load them.

The reset and backfill are explicit deployment operations, not startup behavior.
The legacy synthetic/index history is discarded after taking a rollback backup.
The real backfill uses up to 30 days of hourly gauge samples and up to 365 days
of complete daily rainfall windows; only source-available periods are imported.
Old clipped values cannot be recovered from the legacy table.

Verification covers source errors, finite/signed values, genuine zero rainfall,
complete rain windows, gauge/datum changes, mean provenance, idempotent
migrations, correction upserts, import preservation of live readings, history
range limits, private account boundaries and user isolation. Frontend build,
lint and desktop/mobile browser checks accompany deployment verification.

Follow-up scope: a suitable Thuringian water authority source for Erfurt/Gera;
longer verified gauge archives; additional gauges per state. These are coverage
extensions, not replacements with estimated or synthetic values.

See [Jarvis deployment](../deploy/jarvis/README.md) for operations and rollback.

## Interface follow-up (17 October 2026)

Restored the original droplet icon and the existing shadcn sidebar with desktop
icon collapse, mobile drawer, and separate navigation and expandable places
sections. Removed the desktop header and decorative slogans. Map controls now
support wheel/pinch zoom, drag panning, zoom buttons, fit-to-Germany, selected-state
focus and keyboard navigation (+/−, arrows, 0 to reset). Map position and sidebar
collapse state survive navigation during the session. Place selection uses router
search parameters so navigation and the browser Back button stay in sync.

Verified type checking, lint and the production frontend build; exercised search,
place expansion, sidebar collapse, account navigation, map controls and a 390px
mobile drawer/detail flow in the browser. Backend ingestion and stored observations
are unchanged. Jarvis frontend image: `localhost/droplet-frontend:water-ui-20261017`.
