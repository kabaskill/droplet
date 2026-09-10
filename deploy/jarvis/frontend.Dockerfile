FROM docker.io/oven/bun:1 AS builder

WORKDIR /app

COPY frontend/package.json frontend/bun.lock ./
RUN bun install --frozen-lockfile

COPY frontend/index.html frontend/tsconfig.app.json frontend/tsconfig.json frontend/tsconfig.node.json frontend/vite.config.ts frontend/eslint.config.js frontend/components.json ./
COPY frontend/public ./public
COPY frontend/src ./src

ENV VITE_API_BASE_URL=/api \
    VITE_AUTH_MODE=keycloak \
    VITE_DEMO_FALLBACK=true \
    VITE_KEYCLOAK_CLIENT_ID=droplet-frontend \
    VITE_KEYCLOAK_REALM=droplet \
    VITE_KEYCLOAK_URL=https://droplet.oguzkabasakal.com/auth

RUN bun run build

FROM docker.io/library/caddy:2-alpine

COPY deploy/jarvis/frontend.Caddyfile /etc/caddy/Caddyfile
COPY --from=builder /app/dist /srv

EXPOSE 8080
