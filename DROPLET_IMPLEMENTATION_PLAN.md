# Droplet: Germany Water State Platform — Prototype Implementation Plan

## Prototype Specs:
- Name: Droplet
- Description: Germany's Water State Platform

## Project Goal

Build a production-minded prototype that demonstrates:

- modern SaaS architecture
- gradual modernization thinking
- operational frontend UX
- cloud-ready backend structure
- offline resilience
- enterprise authentication
- state aggregation instead of raw API passthrough

The prototype should feel like:

> a scalable environmental state platform

NOT:

> a simple weather dashboard.

---

# Core Product Vision

Germany’s water system is modeled as a slow-moving, state-based reservoir driven by real environmental signals, where user interaction does not alter reality but increases clarity and visibility of the system over time.

The application visualizes environmental state snapshots across German regions.

Users:
- explore regions
- inspect water-related indicators
- observe trends over time
- gain visibility/confidence into environmental conditions

The platform prioritizes:
- operational clarity
- mobile usability
- reliability
- scalable architecture
- progressive cloud-ready design

---

# Architecture Philosophy

## DO NOT build

- microservice complexity
- real-time systems
- GIS-heavy mapping
- advanced AI systems
- overly artistic frontend
- raw API passthrough architecture

---

## DO build

- clean layered architecture
- snapshot persistence
- background ingestion workers
- caching strategy
- role-based auth
- mobile-first operational UI
- modular services
- scalable foundations

---

# Technical Stack

## Frontend

- Bun
- Vite
- React 19
- TypeScript
- Zustand
- TanStack Query
- TanStack Router
- TailwindCSS
- lucide-react for icons
- shadcn/ui for selected accessible UI primitives
- PWA plugin (optional, last priority, don't attempt to implement if not asked by the developer)

---

## Backend

- Flask
- SQLAlchemy
- PostgreSQL
- Redis
- Celery
- Keycloak OIDC/OAuth2 integration
- Backend validation of Keycloak-issued JWT access tokens

---

## Authentication

- Keycloak
- OAuth2 / OpenID Connect

---

## Infrastructure

- Docker Compose

---

# High-Level System Architecture

```txt
External APIs
    ↓
Ingestion Workers
    ↓
Normalization Layer
    ↓
Reservoir Snapshot Engine
    ↓
PostgreSQL
    ↓
Cached API Read Models
    ↓
React Frontend
```

---

# Core Backend Concept

The backend should NOT proxy external APIs directly.

Instead:

1. Fetch environmental data
2. Normalize it
3. Compute state snapshots
4. Persist snapshots
5. Serve stable frontend read models

This demonstrates:
- scalable thinking
- operational reliability
- architectural maturity
- gradual modernization mindset

---

# Data Sources (Maximum 3)

- IMPORTANT: If there's any ambiguity or errors about getting access to these APIs consult the developer for the fix.

## 1. Deutscher Wetterdienst (DWD)

Purpose:
- rainfall
- humidity
- temperature
- evaporation estimation

Used for:
- rainfall contribution
- environmental pressure
- weather context

---

## 2. Pegelonline

Purpose:
- river/water level measurements

Used for:
- regional water state
- trend calculations
- reservoir confidence

---

## 3. Open-Meteo

Purpose:
- fallback forecasts
- simplified weather access

Used for:
- trend simulation
- frontend forecasts
- future environmental pressure estimates

---


# Frontend State Strategy

Use a clear split between server state and client/app state.

## Server State

Use TanStack Query for:
- API data
- environmental snapshots
- loading states
- error states
- retries
- stale data handling
- offline cache persistence

## Client/App State

Use Zustand for:
- selected region
- active map layer
- sidebar state
- UI filters
- comparison mode
- demo/debug controls
- AI analysis panel state

Avoid spreading `useState` everywhere for shared app behavior.
Avoid React Context unless a library requires it or it solves a very narrow problem.

This keeps the frontend simple, predictable, and easy for an AI coding agent to extend.

---

# React 19 Strategy

Use modern React 19 patterns pragmatically.

## Include

- React Compiler enabled
- Suspense boundaries where useful
- `useTransition` for non-blocking UI updates
- React 19 async patterns where they reduce complexity
- minimal manual memoization

## Avoid

- unnecessary `useMemo`
- unnecessary `useCallback`
- forcing the `use` hook everywhere just because it is new
- premature performance micro-optimizations

React Compiler should handle most memoization needs. Manual memoization should only be added when there is a clear reason.

TanStack Query remains the main server-state and caching layer.

Zustand remains the main client/app state layer.

---

# Frontend Product Direction

## Visual Style

Operational / Enterprise.

Inspired by:
- monitoring platforms
- operational dashboards
- environmental systems
- municipal tooling

Avoid:
- flashy animations
- excessive gradients
- artistic interfaces

Focus on:
- clarity
- mobile ergonomics
- efficient navigation
- readable metrics

---

# Frontend UI Component Strategy

Use lucide-react and shadcn/ui pragmatically.

## Icons

Use lucide-react as the default icon library.

Recommended icon direction:
- clean
- minimal
- operational
- enterprise-friendly
- readable at small sizes

Suggested icons:
- Droplets
- CloudRain
- Activity
- Map
- Database
- Server
- ShieldCheck
- WifiOff
- RefreshCw
- Brain
- AlertTriangle

## shadcn/ui Usage

Use shadcn/ui selectively as a component accelerator, not as the full visual identity of the app.

Use shadcn/ui for accessible primitives:
- Button
- Card
- Badge
- Tabs
- Dialog
- Sheet
- DropdownMenu
- Tooltip
- Skeleton
- Alert
- Progress

Avoid using shadcn/ui to define:
- the main product layout
- the Germany map experience
- the reservoir visualization
- the visual identity of Droplet
- the full dashboard composition

Rule:

> shadcn/ui provides primitives. Droplet provides the product experience.

This keeps development fast without making the app feel like a generic shadcn dashboard.

---

# Frontend Feature Scope

## MVP Features

### Authentication

- Keycloak login
- protected routes
- role-based access

---

### Germany Region Map

Simple SVG map.

Requirements:
- clickable regions
- hover states
- selected region state
- mobile responsive

IMPORTANT:
Map asset should be manually sourced by developer.
Do NOT waste AI agent time generating SVGs.

Developer responsibility:
- find optimized Germany SVG map
- optionally simplify SVG manually

---

### Region Detail Panel

Displays:
- rainfall index
- water level
- evaporation pressure
- confidence score
- trend direction
- historical chart

---

### Reservoir State Visualization

Simple operational visualization.

Ideas:
- layered water fill
- confidence opacity
- trend indicators
- visibility score

Keep implementation lightweight.

---

### Offline Support (Basic)

Requirements:
- cache latest API responses
- app usable after refresh
- stale data indicator

Implementation:
- TanStack Query persistence
- localStorage initially

Optional later:
- IndexedDB
- queued sync behavior

---

# Backend Feature Scope

## Flask API Responsibilities

### API Endpoints

```txt
/api/auth
/api/regions
/api/snapshots
/api/analytics
/api/ai/analyze
```

---

### Snapshot Engine

Core responsibility:

Convert environmental data into normalized reservoir snapshots.

Example structure:

```ts
ReservoirSnapshot {
  regionId
  timestamp

  rainfallIndex
  waterLevel
  evaporationPressure

  confidenceScore
  visibilityScore

  trend
}
```

---

### Background Workers

Use Celery + Redis.

Responsibilities:
- fetch environmental data
- normalize API responses
- compute snapshots
- refresh cached read models

---

### Redis Usage

ONLY use Redis for:

1. Celery queues
2. API caching
3. optional rate limiting

Avoid overengineering.

---

# Authentication Architecture

## Keycloak Integration

Use Keycloak as the identity provider via OIDC/OAuth2.

Important distinction:

- Keycloak handles login and token issuing
- The React app receives a Keycloak access token
- The Flask API validates Keycloak-issued JWT access tokens
- The app must NOT issue its own JWTs

Requirements:
- Dockerized Keycloak
- realm setup
- frontend login flow
- bearer token handling
- backend JWT validation using Keycloak public keys
- role-aware routes

---

## Roles

Suggested roles:

- citizen
- analyst
- municipality

---

## Role Behavior

Example:

| Role | Access |
|---|---|
| citizen | basic visibility |
| analyst | advanced analytics |
| municipality | deeper historical access |

The implementation can remain lightweight.

The purpose is demonstrating:
- enterprise auth awareness
- SaaS RBAC thinking
- scalable permission architecture

---

# AI Integration (Lightweight)

IMPORTANT:
Keep this extremely simple.

This is NOT an AI project.

Runtime AI feature:
- use the ChatGPT / OpenAI API
- call it only from the Flask backend
- never expose API keys in the React frontend

Development assistant:
- use Codex through OpenCode and/or Cursor for coding tasks

Keep these two meanings of AI separate:

- Codex helps build the app
- ChatGPT/OpenAI API powers the app's analysis feature

---

## Goal

Send current regional snapshot state to an LLM API.

Example prompt:

```txt
Analyze the following environmental state.
Provide:
- anomalies
- risk indicators
- stability observations
- short operational recommendations
```

---

## Backend Endpoint

```txt
POST /api/ai/analyze
```

Recommended request flow:

```txt
React → Flask /api/ai/analyze → OpenAI API → Flask → React
```

Reason:
- protects API keys
- centralizes rate limiting
- allows prompt control
- makes logging/auditing easier

---

## Input

Current snapshot JSON.

---

## Output

Simple structured analysis:

```json
{
  "summary": "...",
  "riskLevel": "medium",
  "recommendations": []
}
```

---

## Suggested Provider

Use OpenAI / ChatGPT API first.

Gemini can remain a future option, but the prototype plan should target one provider to reduce implementation friction.

Developer responsibility:
- manage API keys manually
- configure env variables

AI agent should NOT manage secrets.

---

# Mobile-First UX Priorities

The prototype should behave well on:
- tablets
- mobile devices
- narrow screens

Reason:
This aligns strongly with:
- field operations
- enterprise mobility
- Greenware's SaaS direction

---

# Docker Compose Architecture

```yaml
services:
  frontend:
  backend:
  worker:
  postgres:
  redis:
  keycloak:
```

---

# Recommended Repository Structure

```txt
project-root/
├── frontend/
├── backend/
├── infrastructure/
├── docs/
└── docker-compose.yml
```

---

# Frontend Structure

```txt
frontend/
├── app/
├── components/
│   ├── ui/          # shadcn/ui primitives
│   └── app/         # custom Droplet product components
├── features/
│   ├── auth/
│   ├── map/
│   ├── reservoir/
│   └── analytics/
├── stores/        # Zustand app/client state
├── services/      # API clients
├── hooks/         # TanStack Query hooks and small reusable hooks
├── routes/
└── lib/
```

---

# Backend Structure

```txt
backend/
├── api/
├── auth/
├── cache/
├── domain/
├── models/
├── repositories/
├── services/
├── tasks/
└── workers/
```

---

# AI Agent Strategy

Primary coding assistant:

- Codex CLI with GPT 5.5

IMPORTANT:
The AI coding agent should NOT attempt everything.

Use Codex for:
- boilerplate
- scaffolding
- API integration
- component implementation
- Docker setup
- route generation
- database models
- Zustand store setup
- TanStack Query hooks
- Keycloak integration helpers
- Flask endpoint structure
- lucide-react icon usage
- shadcn/ui primitive setup and wiring

---

## Developer Responsibilities

The human developer should manually handle:

### Assets
- Germany SVG map
- visual references
- branding
- final icon choices if a specific visual metaphor is preferred

---

### Product Decisions
- layout decisions
- UX prioritization
- visual hierarchy
- architecture tradeoffs
- where shadcn/ui should stop and custom Droplet components should begin

---

### Final Integration
- debugging
- orchestration
- reviewing generated code
- removing overengineering

---

# Suggested Build Order

## Phase 1 — Foundation

Goal:
Working infrastructure.

Tasks:
- Docker Compose
- Flask setup
- React 19 setup
- React Compiler setup
- Zustand store setup
- TanStack Query setup
- PostgreSQL connection
- Redis connection
- Keycloak OIDC/OAuth2 integration
- Flask validation of Keycloak-issued JWT access tokens
- protected frontend routes

Deliverable:
User can login and access application shell.

---

## Phase 2 — Data Pipeline

Goal:
Environmental snapshot architecture.

Tasks:
- API ingestion services
- Celery workers
- normalization layer
- snapshot persistence
- region endpoints

Deliverable:
Frontend receives normalized snapshot data.

---

## Phase 3 — Frontend Experience

Goal:
Operational visualization.

Tasks:
- Germany SVG integration
- region interaction
- detail panel
- charts
- responsive layout
- lucide-react icon integration
- selective shadcn/ui primitive usage
- loading states
- stale data indicators

Deliverable:
Usable operational prototype.

---

## Phase 4 — Resilience

Goal:
Production-minded polish.

Tasks:
- response caching
- TanStack Query offline persistence
- stale data indicators
- retry handling
- API error boundaries
- optimistic UI polish
- avoid unnecessary manual memoization unless clearly needed

Deliverable:
Reliable-feeling SaaS experience.

---

## Phase 5 — AI Analysis

Goal:
Lightweight intelligence layer.

Tasks:
- AI analysis endpoint
- prompt template
- frontend analysis panel
- loading/error states

Deliverable:
AI-assisted environmental observations.

---

# Interview Positioning

The project should be presented as:

> a prototype for scalable environmental state management

Key talking points:

- snapshot persistence
- operational reliability
- gradual modernization
- offline resilience
- enterprise authentication using Keycloak OIDC/OAuth2
- backend JWT validation of Keycloak-issued access tokens
- cloud-ready architecture
- mobile operational UX
- scalable ingestion design
- role-based visibility

---

# What NOT To Spend Time On

Avoid:

- advanced animations
- microservices
- Kubernetes
- complex GIS systems
- perfect design systems
- turning the app into a generic shadcn dashboard
- advanced AI agents
- real-time websockets
- pixel-perfect visual polish
- complicated analytics

The goal is:

> believable production-minded architecture shipped quickly.

---

# Success Criteria

The prototype succeeds if:

- login works
- architecture is understandable
- environmental snapshots work
- frontend feels operational
- mobile layout works
- offline cache works
- data pipeline is believable
- system looks scalable
- codebase structure looks professional
- frontend state split is clear: TanStack Query for server state, Zustand for app state

The prototype does NOT need:

- full production completeness
- real scalability
- advanced infrastructure
- complete feature coverage
- exhaustive environmental accuracy

---

# Final Product Narrative

This project demonstrates:

- modernization of legacy-style operational systems
- scalable SaaS thinking
- environmental state aggregation
- enterprise-ready frontend/backend architecture
- resilient mobile-first operational UX
- pragmatic engineering prioritization

The project should feel aligned with:
- cloud transformation
- operational platforms
- enterprise modernization
- field/mobile software
- scalable business systems

