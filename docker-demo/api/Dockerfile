# syntax=docker/dockerfile:1.5
# -----------------------------------------------------------------------------
# API IMAGE
# -----------------------------------------------------------------------------
# This multi-stage Dockerfile produces the Express API image that compose.yml
# references as the `api` service.  Each instruction is annotated so you can
# see how it supports the final container behaviour that compose.yml expects
# (port 4000, curl-based health checks, non-root user, etc.).

# -----------------------------------------------------------------------------
# Shared base stage
# -----------------------------------------------------------------------------
# Use the slim Debian-based Node.js image so all subsequent stages share layers.
FROM node:20-bookworm-slim AS base
# All commands run inside /app so volume mounts in compose align with this path.
WORKDIR /app

# -----------------------------------------------------------------------------
# Stage 1: dependency install
# -----------------------------------------------------------------------------
# Installing dependencies in their own layer means later source edits can reuse
# this cache as long as package-lock.json stays the same.
FROM base AS deps
COPY package*.json ./
RUN npm install

# -----------------------------------------------------------------------------
# Stage 2: build + prune
# -----------------------------------------------------------------------------
# Copy the entire API source tree, compile TypeScript to dist/, then remove
# devDependencies.  compose.yml mounts this build artifact into the runtime
# stage below via `COPY --from`.
FROM deps AS build
COPY . .
RUN npm run build
RUN npm prune --omit=dev

# -----------------------------------------------------------------------------
# Stage 3: runtime image
# -----------------------------------------------------------------------------
# This stage emits the container launched by `docker compose up api`.
FROM node:20-bookworm-slim AS runtime
WORKDIR /app
# compose.yml sets NODE_ENV=production too, but baking it in protects ad-hoc
# `docker run` usage and ensures npm behaves predictably.
ENV NODE_ENV=production
# Install curl for the healthcheck, then create the same non-root user id that
# compose.yml references via `user: "10001:10001"`.
RUN apt-get update \
  && apt-get install -y --no-install-recommends curl \
  && rm -rf /var/lib/apt/lists/* \
  && useradd -u 10001 -r -s /usr/sbin/nologin appuser
# Bring over only the compiled output and runtime deps from the build stage.
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
# Keep package metadata for runtime tooling (e.g., npm scripts, version info).
COPY package*.json ./
# Run as the locked-down user so Docker and compose security settings align.
USER 10001
# Matches the compose.yml healthcheck, which waits for /health on port 4000.
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD curl -f http://localhost:4000/health || exit 1
# Entry point used by compose.yml and documentation.
CMD ["node", "dist/server.js"]
