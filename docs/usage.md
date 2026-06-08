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

By default the app runs in demo auth mode. Demo mode signs in as `Droplet Analyst` and enables citizen, analyst, and municipality features.

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

- Summary tiles show observed regions, dominant trend, and data freshness.
- The map visualizes Germany by selected operational layer.
- Regional filters narrow the map by status or risk profile.
- Selecting a state opens detailed water level, rainfall, evaporation pressure, confidence, source, and trend data.
- The climate context panel shows selected-state sunlight feasibility, air-quality risk, normalized source labels, CO2 candidate source status, and climate read-model cache freshness.
- The forecast panel shows 48-hour pressure outlooks when forecast coverage is available.
- Offline state is detected in the browser, and cached read models are clearly labeled.

Climate context is supplemental. It does not change the persisted reservoir snapshot and should not block water-state review if a climate source is partial or unavailable. CO2 appears as candidate source metadata rather than a live measured score.

## Trends

The Trends page focuses on historical movement for the selected region.

- Snapshot history is loaded from `/api/snapshots/<region_id>`.
- Analyst and citizen users receive shorter history than municipality users.
- Municipality users can request up to 365 records.
- The page is useful for comparing rising, falling, and stable conditions over time.

## Health

The Health page explains operational data reliability.

- Source health summarizes current source coverage and confidence.
- Ingestion status reports the latest snapshot refresh state.
- Freshness panels show when important read models were last loaded by the frontend.
- Manual refresh starts a new ingestion job when the user has an analyst or municipality role.

## AI

The AI page sends selected water-state payloads to the backend for analysis.

- The backend calls Gemini only when `GEMINI_API_KEY` is configured.
- AI output is returned as short JSON-backed observations, recommendations, risk level, scope label, and summary.
- Completed AI analyses are saved per user and can be listed later.
- Role context affects the prompt: municipality users receive the most operationally specific analysis.

## User

The User page shows the active identity and role set.

- Demo auth uses a built-in local user.
- Keycloak auth uses the imported `droplet` realm.
- Role-gated actions require `analyst` or `municipality`.

## Refreshing Data

The refresh button has three meanings:

- `Current`: latest read models loaded successfully.
- `Syncing`: the frontend is refetching read models.
- `Stale`: cached data is available but should be refreshed.

When a manual snapshot refresh is allowed, the frontend posts to `/api/snapshots/refresh`, receives a task id, then polls `/api/snapshots/refresh/<task_id>` until the job completes or fails.

```mermaid
sequenceDiagram
  participant User
  participant Frontend
  participant API
  participant Worker
  participant DB as PostgreSQL
  participant Redis

  User->>Frontend: Click refresh
  Frontend->>API: POST /api/snapshots/refresh
  API->>Worker: Queue refresh task
  API-->>Frontend: 202 queued + task id
  Worker->>DB: Insert/update snapshots
  Worker->>Redis: Invalidate read-model cache keys
  Frontend->>API: Poll refresh status
  API-->>Frontend: completed
  Frontend->>API: Refetch read models
```

## Roles

| Role | Can read basic state | Can view operations read models | Can refresh snapshots | History depth |
|---|---:|---:|---:|---:|
| `citizen` | Yes | Limited | No | Up to 90 |
| `analyst` | Yes | Yes | Yes | Up to 365 |
| `municipality` | Yes | Yes | Yes | Up to 365 |

## Demo Fallback

The frontend can fall back to demo data for non-auth API failures when `VITE_DEMO_FALLBACK` is not `false`. Authentication errors do not use demo fallback because they represent invalid or expired sessions.
