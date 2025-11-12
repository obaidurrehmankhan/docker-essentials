
# Docker Essentials Daily Routine Concepts

Minimal repo to learn and demo the **15 core Docker concepts** used in everyday dev work. Includes short notes, a practical cheat sheet, and a small runnable demo (Node.js API + Nginx UI + Postgres) via Docker Compose.

## What’s inside

* **/concepts/** – one-pagers for each concept
* **/cheatsheet/** – concise command cheat sheets
* **/demo/** – Node API, Nginx UI, Postgres + Compose files (To do)

## The 15 concepts

1. Images vs Containers & Layers
2. Dockerfile Basics
3. `.dockerignore`
4. Multi-Stage Builds
5. Build Cache, BuildKit & Buildx
6. Tagging & Versioning
7. Container Lifecycle & Debugging
8. Healthchecks
9. Volumes vs Bind Mounts
10. Networking & Port Mapping
11. Environment Variables & Secrets
12. Docker Compose v2 Essentials
13. Compose Overrides & Profiles
14. Resource Limits (CPU/Memory)
15. Security Basics (non-root, caps, read-only)

## Quick start (demo) - To do

```bash
cd demo
cp .env.example .env
docker compose up -d
# open http://localhost:8080
```

## Requirements

* Docker Engine / Docker Desktop
* Docker Compose v2 (`docker compose`)

## Notes

* Local-only demo; no cloud deploy.
* Keep changes in `/concepts` and `/cheatsheet` small and practical.
