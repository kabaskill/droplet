# How to Use Droplet

Droplet is an operational workspace for reviewing water-state conditions across German federal states. It combines current reservoir snapshots, trend history, source health, forecast pressure, and optional AI analysis.

## Start The App

Run the full local stack:

```bash
docker compose up --build
```

Open the frontend at:

```text
http://localhost:5173
```

The backend health endpoint is:

```text
http://localhost:5000/healthz
```

The main workspace is public. Keycloak is the fail-closed default for account-only AI; an explicit demo mode provides a built-in identity for local development.

## Navigation

```mermaid
flowchart TD
  App[Droplet workspace] --> Home[Home]
  App --> Trends[Trends]
  App --> Health[Health]
  App --> AI[AI]
  App --> User[User]
```

## Home

The Home page is the main operations view.

- The workspace shell uses a collapsible sidebar for navigation, refresh state, session controls, and state search.
- The D3 Germany state canvas supports pan, zoom, reset, fit-to-view, selected-state focus, pointer selection, and keyboard state selection.
- Home layers are Overview, Water, Climate, Forecast, and Data quality. Overview blends the other four signals into one operational score.
- Regional filters narrow visible states by status or risk profile without switching into water-system-only map modes.
- Selecting a state updates the right rail with region metadata, water snapshot, climate context, forecast outlook, source tags, warnings, and read-model freshness.
- On mobile, selected-state details open in a responsive sheet while navigation remains in the sidebar drawer.
- Offline state is detected in the browser, and cached read models remain labeled through the freshness panel.

Climate context is supplemental. It does not change the persisted reservoir snapshot and should not block water-state review if a climate source is pending, partial, or unavailable. CO2 appears as candidate source metadata rather than a live measured score.

Climate data is refreshed through backend workers. On a cold cache, the panel can show pending climate context while a region refresh is queued. On stale cache, the panel keeps showing the cached context and labels whether refresh is queued, pending behind an existing lock, failed, or idle.

## Trends

The Trends page focuses on historical movement for the selected region.

- Snapshot history is loaded from `/api/snapshots/<region_id>`.
- Everyone can request up to 365 records.
- The page is useful for comparing rising, falling, and stable conditions over time.

## Health

The Health page explains operational data reliability.

- Source health summarizes current source coverage and confidence.
- Ingestion status reports the latest snapshot refresh state.
- Freshness panels show when important read models were last loaded by the frontend.
- The refresh control reloads already-computed read models. Scheduled workers update the underlying data.

## AI

The AI page sends selected water-state payloads to the backend for analysis.

- The backend calls Gemini only when `GEMINI_API_KEY` is configured.
- AI output is returned as short JSON-backed observations, recommendations, risk level, scope label, and summary.
- Completed AI analyses are saved per user and can be listed later.
- A free account is required for AI calls and saved history.

## User

The User page shows the active identity.

- Demo auth uses a built-in local user.
- Keycloak auth uses the imported `droplet` realm.
- Keycloak users all have the same account capabilities.

## Refreshing Data

The refresh button has three meanings:

- `Current`: latest read models loaded successfully.
- `Syncing`: the frontend is refetching read models.
- `Stale`: cached data is available but should be refreshed.

The browser refresh action invalidates its cached queries and reloads public read models. It does not start an ingestion job.

```mermaid
sequenceDiagram
  participant User
  participant Frontend
  participant API
  User->>Frontend: Click refresh
  Frontend->>API: Refetch public read models
  API-->>Frontend: Current cached or persisted data
```

## Access

| Capability | Guest | Free account |
|---|---:|---:|
| Dashboard, trends, health, forecasts, and climate | Yes | Yes |
| Snapshot history (up to 365 records) | Yes | Yes |
| AI analysis | No | Yes |
| Saved AI history | No | Yes |

## Demo Fallback

The frontend can fall back to demo data for non-auth API failures when `VITE_DEMO_FALLBACK` is not `false`. Authentication errors do not use demo fallback because they represent invalid or expired sessions.
