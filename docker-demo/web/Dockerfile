# syntax=docker/dockerfile:1.5
# -----------------------------------------------------------------------------
# WEB IMAGE
# -----------------------------------------------------------------------------
# Builds the Next.js frontend that compose.yml exposes as the `web` service.
# The steps mirror the API Dockerfile so both containers share a similar
# security posture and operational story (health checks, non-root users, etc.).

# -----------------------------------------------------------------------------
# Shared base stage
# -----------------------------------------------------------------------------
FROM node:20-bookworm-slim AS base
WORKDIR /app

# -----------------------------------------------------------------------------
# Stage 1: dependency install
# -----------------------------------------------------------------------------
# Layering dependency installation keeps rebuilds fast when only app code
# changes because `package-lock.json` controls cache busting.
FROM base AS deps
COPY package*.json ./
RUN npm install

# -----------------------------------------------------------------------------
# Stage 2: Next.js build output
# -----------------------------------------------------------------------------
# After copying the project, Next.js compiles into .next which the runtime
# container serves.  npm prune removes dev-only tooling to shrink layers.
FROM deps AS build
COPY . .
RUN npm run build
RUN npm prune --omit=dev

# -----------------------------------------------------------------------------
# Stage 3: runtime image
# -----------------------------------------------------------------------------
# This final image is what compose.yml builds when it starts the `web` service.
FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
# curl provides the HTTP healthcheck probe; the same UID/GID appears in
# compose.yml so Docker can enforce filesystem permissions.
RUN apt-get update \
  && apt-get install -y --no-install-recommends curl \
  && rm -rf /var/lib/apt/lists/* \
  && useradd -u 10001 -r -s /usr/sbin/nologin appuser
# Copy only the assets required at runtime.
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/node_modules ./node_modules
COPY package*.json ./
USER 10001
# Align the Dockerfile healthcheck with compose.yml (port 3000 /health).
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD curl -f http://localhost:3000/health || exit 1
# Use `npm run start` instead of `next start` so package scripts stay in charge.
CMD ["npm", "run", "start"]
