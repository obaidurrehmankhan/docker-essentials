# Docker Concepts Demo — Next.js + Express + Postgres

Minimal, runnable demo showing **15 core Docker concepts** using a Next.js UI, an Express API, and Postgres (Redis optional). No cloud. Just Docker/Compose.

## Concepts map
1. Images vs Containers & Layers → `docker history`, `docker image ls`  
2. Dockerfile Basics → `web/Dockerfile`, `api/Dockerfile`  
3. .dockerignore → `web/.dockerignore`, `api/.dockerignore`  
4. Multi-Stage Builds → both Dockerfiles  
5. Build Cache/BuildKit → Dockerfile order; try `buildx --progress=plain`  
6. Tagging/Versioning → `docker tag/push/pull` (see commands)  
7. Lifecycle & Debugging → logs/exec/inspect (see commands)  
8. Healthchecks → Dockerfiles + Compose db check  
9. Volumes vs Bind Mounts → `dbdata` volume; dev bind mounts in `compose.dev.yml`  
10. Networking & Ports → user network; `web:8080->3000`, DNS names (`api`, `db`)  
11. Env Vars & Secrets → `.env.example`, Compose `environment:`  
12. Compose v2 → `compose.yml`  
13. Overrides & Profiles → `compose.dev.yml` (dev profile)  
14. Resource Limits → see notes/flags below  
15. Security Basics → non-root, read-only, tmpfs, cap_drop

## Prereqs
- Docker Engine/Desktop + Compose v2

## Quick start (prod-like)
```bash
cp .env.example .env
docker compose up -d
# open:
xdg-open http://localhost:8080 || open http://localhost:8080
```

**Verify:**

* Click **Ping API** → shows `{ ok: true }`.
* Click **Add Visit** → increments row in Postgres and shows the new count.

## Docker demo file tour

Think of the demo like a small restaurant: the database is the pantry, the API
is the kitchen, the web app is the dining room, and Docker Compose is the floor
manager keeping everyone in sync. Each of the following files plays a specific
role in making that restaurant run smoothly.

### `docker-demo/api/Dockerfile`

This file is the kitchen’s recipe card for the API. It gathers ingredients
dependencies in one stage, cooks the meal by compiling TypeScript in the next,
and plates the final dish in a slim runtime image with a prepped `dist/`
folder. The compose file later orders this image whenever it needs the API
service, so the Dockerfile makes sure the user account, health check, and
environment match what Compose expects.

### `docker-demo/web/Dockerfile`

The web Dockerfile mirrors the API recipe so both parts of the meal share the
same hygiene rules. It installs packages, bakes the Next.js pages into `.next`,
and then shrinks everything down to a tidy runtime that serves visitors on port
3000. Because it follows the same stages and user IDs as the API image, Compose
can enforce the same security knobs without extra work.

### `docker-demo/compose.yml`

Compose is the floor manager arranging every room in the restaurant. This file
declares the four services the stack needs: Postgres (pantry), API (kitchen),
web (dining room), and Redis (a tiny prep fridge on the side). It wires in
shared networks so they can call each other by name, applies the health checks
the Dockerfiles provide, passes environment variables, and controls resource
limits so no single container hogs the host. When you run “bring up the stack,”
this is the blueprint Docker follows.

### `docker-demo/compose.dev.yml`

When you switch from hosting dinner to experimenting with new dishes, you need
faster feedback. This override file is that test kitchen. Compose only loads it
when the `dev` profile is requested, at which point it mounts your local source
folders straight into the containers and runs the hot-reload scripts. Because
it sits on top of the base compose file, it reuses all the same networking and
service names, so you can jump between production-like and development-like
setups without relearning anything.

### `docker-demo/Makefile`

The Makefile is the handy checklist hanging by the kitchen door. Each target
wraps a Compose command (“open the doors,” “show me the logs,” “drop me into the
API shell”) so you do not have to remember long flag strings. It also explains
which compose files are combined for the dev profile, keeping the pairing
between `compose.yml` and `compose.dev.yml` obvious for anyone new to the repo.


## Dev mode (hot reload)

```bash
docker compose -f compose.yml -f compose.dev.yml --profile dev up -d
docker compose logs -f api
```

## Handy commands

```bash
docker compose ps
docker compose logs -f web
docker compose exec api sh
docker inspect $(docker compose ps -q db) | jq '.[0].State.Health'
docker volume ls
docker history $(docker compose images api -q)
```

## Optional BuildKit view

```bash
docker buildx build --progress=plain -t web:test ./web
```

## Cleanup

```bash
docker compose down
# remove data volume (data loss)
docker volume rm docker-15-nextjs-demo_dbdata
```
---
