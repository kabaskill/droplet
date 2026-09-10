# Jarvis deployment

Droplet runs as an isolated rootless Podman stack on Jarvis. The frontend, API,
worker, scheduler, PostgreSQL, Redis, and Keycloak each have their own container.
Only Caddy can reach the containers through `projects.network`; no database,
cache, API, or identity-provider port is published on the host.

The production frontend is built once and served as static assets. The backend
uses Gunicorn. PostgreSQL, Redis, and Keycloak use named persistent volumes.
Runtime secrets live in `~/services/config/droplet` on Jarvis and are not part of
the repository.

The public Caddy route is `droplet.oguzkabasakal.com`. The Cloudflare tunnel must
publish that hostname to `http://caddy:8080`, the same internal origin used by
the Doner route.

The Gemini key is intentionally omitted at first. Add authentication controls
and request limiting before enabling a paid AI endpoint on a public hostname.
