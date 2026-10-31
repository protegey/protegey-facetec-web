# syntax=docker/dockerfile:1

# Static SPA (Vite + React) — the FaceTec liveness/selfie capture flow a partner's customer is
# redirected to during KYC. On-premise needs its own instance: sessions are launched in the
# client's own name, not routed through Protegey's own infrastructure — same reasoning as
# partner-web already has in docker-compose.on-premise.yml.
#
# No backend-style hardening here (the minification/obfuscation the NestJS Dockerfiles use): this
# ships straight to end-user browsers, already fully visible via View Source/devtools regardless
# of anything the server does — there is no "docker exec" threat model for code that's public by
# definition the moment it's served.

FROM node:24-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@11.25.0 --activate

COPY package.json pnpm-lock.yaml ./
# Cache mount + reduced concurrency — same reasoning as protegey-backend's own Dockerfiles.
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --network-concurrency=4

COPY . .
# Vite bakes import.meta.env.VITE_* into the bundle at build time, not read at runtime — same
# constraint protegey-partner-web's own Dockerfile already documents for its one build-time var.
# VITE_API_BASE defaults to a full external API URL (not the relative /api/v1 path .env.example
# shows for local dev) since this image has no reverse proxy of its own in front of the api
# container; a per-launch override still works via the `apiBase` query param partner-web already
# sends when it redirects a customer here (see .env.example / src/App.tsx) — this build-time
# default is only what loads if nothing else is passed.
ARG VITE_API_BASE
ARG VITE_FACE_TEC_DEVICE_KEY
ENV VITE_API_BASE=$VITE_API_BASE
ENV VITE_FACE_TEC_DEVICE_KEY=$VITE_FACE_TEC_DEVICE_KEY
RUN pnpm run build

# nginx:alpine, not distroless — this is a plain static file server, every file it serves is
# already public by design, and nginx's own healthcheck-friendly shell/wget is actually useful
# here (no equivalent "don't let anyone read the source" goal to defend with distroless).
FROM nginx:alpine AS runtime
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
