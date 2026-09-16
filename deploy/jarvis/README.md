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

## Frontend runtime storage

The frontend container keeps its root filesystem read-only. Its Caddyfile
disables configuration autosave (`persist_config off`) and places Caddy runtime
storage in `/tmp/caddy`, using the Quadlet's existing writable `/tmp` tmpfs.
This prevents autosave, instance ID, and storage-clean lock errors without
making the image filesystem writable. Ephemeral storage is appropriate here
because this internal HTTP server does not manage TLS certificates. TLS is
handled upstream. The internal listener explicitly uses HTTP/1 to avoid the
HTTP/2 and HTTP/3 TLS warnings.

Rebuild and redeploy the frontend image to apply the Caddyfile and UI changes.
No database migration or snapshot recalculation is needed: water-level indices
at zero can be valid readings below their station's low-water reference, and
the UI now identifies them as indices rather than reservoir fill percentages.
