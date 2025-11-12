# Docker Essentials Commands Cheat Sheet (15 Core Concepts)



## 1) Images vs Containers & Layers

**Purpose:** Know what you have (images), what’s running (containers), and how layers/cache look.

```bash
docker image ls [name]                      # list images (optional repo/name filter)
docker history <repo:tag>                   # show image layers (size, instruction)
docker inspect <repo:tag>                   # image JSON (env, labels, repoDigests)
docker container ls -a                      # list running/all containers
docker run --name app -d <repo:tag>         # create+start container from image
docker rm [-f] <container>                  # remove (use -f to kill then remove)
```

*Tips:* Image = recipe; container = running instance; layers are cached build steps.

---

## 2) Dockerfile Basics (FROM/RUN/COPY/CMD/ENTRYPOINT)

**Purpose:** Build images correctly; map Dockerfile instructions to build behavior.

```bash
docker build -t app:dev .                   # build context "."; -t names repo:tag
docker build -f Dockerfile.api -t api:1.0 . # -f select Dockerfile
docker build --no-cache -t app:clean .      # ignore cache (full rebuild)
docker build --pull -t base:latest .        # always pull latest FROM base
```

**Common Dockerfile keys (reference):**
`FROM` base image → `RUN` build-time commands → `COPY` files → `EXPOSE` doc port → `ENV` runtime env → `WORKDIR` default dir → `ENTRYPOINT` main executable → `CMD` default args.

---

## 3) `.dockerignore` (speed + safety)

**Purpose:** Shrink build context; keep secrets/junk out.

```
# deps/build
node_modules/
dist/
build/
coverage/

# vcs/editor
.git/
.vscode/
.DS_Store

# logs/temp
*.log
tmp/

# env/secrets
.env
*.pem
*.key
```

*Rule:* Don’t ignore files you later need to `COPY`.

---

## 4) Multi-Stage Builds

**Purpose:** Build with heavy tools, ship only what you need.

```bash
docker build --target build -t app:build .  # build just the "build" stage
docker build --target runtime -t app:run .  # build just the final/runtime stage
```

*Notes:* Use `AS name` in Dockerfile and `COPY --from=name` to bring artifacts to the tiny final image. Keep build/run OS families aligned to avoid native module issues.

---

## 5) Build Cache, BuildKit & Buildx

**Purpose:** Faster, reproducible builds; multi-arch; secrets; shared cache.

```bash
# Verbose step logs (see cache hits/misses)
docker buildx build --progress=plain -t app:dev .

# Multi-arch build and push (amd64+arm64)
docker buildx build --platform linux/amd64,linux/arm64 -t user/app:multi --push .

# Build-time secret (not baked in layers)
docker buildx build --secret id=npmrc,src=$HOME/.npmrc -t app:dev .

# Share cache via registry (CI)
docker buildx build \
  --cache-to=type=registry,ref=user/app:buildcache,mode=max \
  --cache-from=type=registry,ref=user/app:buildcache \
  -t user/app:dev .
```

*Ordering:* COPY manifests → install deps → COPY source → build. Keep context small.

---

## 6) Tagging & Versioning Strategy

**Purpose:** Predictable deploys and rollbacks.

```bash
docker tag app:dev user/app:1.4.2           # add a new tag (no data copy)
docker tag app:dev user/app:git-<sha>       # immutable commit tag
docker push user/app:1.4.2                  # push specific tag
docker pull user/app@sha256:<digest>        # pull exact image by digest
docker inspect --format '{{.RepoDigests}}' user/app:1.4.2  # show pushed digests
```

*Rules:* Don’t deploy `latest`. Use semver + commit SHA; deploy by digest for exactness.

---

## 7) Container Lifecycle & Debugging (logs/exec/inspect)

**Purpose:** Start/stop, view logs, shell in, copy files, inspect state.

```bash
# Run / stop / remove
docker run --name web -d -p 8080:80 user/app:v1
docker stop web
docker rm web

# Logs / exec / inspect / processes / copy
docker logs -f --tail 100 web               # follow last 100 lines
docker exec -it web sh                      # shell into running container
docker inspect web | less                   # deep JSON (env, mounts, networks, IP)
docker top web                              # show processes inside
docker cp web:/var/log/app ./logs           # copy out from container
```

**Cleanup (safe → aggressive):**

```bash
docker container prune        # remove stopped
docker image prune            # remove dangling images
docker image prune -a         # remove all unused images
docker system prune -af --volumes   # nuke unused (careful)
docker builder prune -af      # clear build cache
```

---

## 8) Healthchecks

**Purpose:** Mark containers healthy/unhealthy for orchestration/gating.

```bash
# Runtime flags
docker run \
  --health-cmd="curl -f http://localhost:8080/health || exit 1" \
  --health-interval=30s --health-timeout=3s \
  --health-retries=3 --health-start-period=10s user/app:v1
```

**Dockerfile form (baked into image):**

```
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1
```

*Keep it tiny and deterministic (0=OK).*

---

## 9) Volumes vs Bind Mounts

**Purpose:** Persist data; live-edit code; control I/O.

```bash
# Volumes (Docker-managed)
docker volume create data
docker volume ls
docker volume inspect data
docker volume rm data

# Mount during run
docker run -v data:/var/lib/postgresql/data postgres:16
#   -v NAME:CTR_PATH         named volume (portable, good for DBs)

docker run -v $(pwd)/site:/usr/share/nginx/html:ro nginx:alpine
#   -v HOST:CTR[:ro]         bind mount host folder; :ro read-only
```

**Explicit --mount syntax:**

```bash
docker run --mount type=volume,source=data,target=/var/lib/postgresql/data postgres:16
docker run --mount type=bind,src=$(pwd)/site,dst=/usr/share/nginx/html,ro nginx:alpine
# type: volume|bind ; source/src: vol name or host path ; target/dst: container path
```

*Desktop tip:* Use volumes (not bind) for DBs on macOS/Windows (faster I/O).

---

## 10) Networking & Port Mapping (bridge/host, DNS)

**Purpose:** Service discovery and external access.

```bash
# Networks
docker network ls
docker network create app-net                 # user-defined bridge (DNS by name)
docker network inspect app-net
docker run --network app-net --name api -d api:v1
docker network connect app-net web            # attach existing container to network

# Ports
docker run -p 8080:80 user/app:v1             # host:container (TCP default)
docker run -p 127.0.0.1:8080:80 user/app:v1   # bind only on loopback (local only)
docker run -p 8443:443/tcp -p 8444:8444/udp user/app:v1
docker run -P user/app:v1                     # publish all EXPOSEd to random host ports

# Host networking (Linux only; no NAT, less isolation)
docker run --network host user/app:v1
```

*Inside containers:* call peers by **service/container name**, not `localhost`.

---

## 11) Environment Variables & Secrets

**Purpose:** Configure at runtime; keep credentials out of images.

```bash
# Runtime env
docker run -e NODE_ENV=production -e PORT=8080 user/app:v1
docker run --env-file .env user/app:v1        # load KEY=VAL lines from file

# Build-time args (for Dockerfile ARG; not kept at runtime)
docker build --build-arg API_BASE=https://api.example.com -t app:dev .

# BuildKit secret (safe during build; not in layers)
docker buildx build --secret id=npmrc,src=$HOME/.npmrc -t app:dev .
# Dockerfile: RUN --mount=type=secret,id=npmrc cat /run/secrets/npmrc > ~/.npmrc
```

*Prod:* Prefer a secrets manager; don’t print secrets in logs.

---

## 12) Docker Compose v2 Essentials

**Purpose:** Define multi-container stacks declaratively; one command to run.

```bash
docker compose up -d                         # start stack (detached)
docker compose ps                            # list services
docker compose logs -f api                   # follow logs for a service
docker compose exec api sh                   # shell into a service container
docker compose down                          # stop and remove
docker compose build                         # build images as per compose file
docker compose pull                          # pull images
docker compose config                        # validate/print merged config
```

*Notes:* Service names = DNS hostnames on the project network. Keep base file clean.

---

## 13) Compose Overrides & Profiles

**Purpose:** Dev vs prod differences without forking files.

```bash
# Multiple files (base + override)
docker compose -f compose.yml -f compose.dev.yml up -d

# Profiles (include optional services on demand)
docker compose --profile dev up -d
docker compose --profile monitoring up -d
```

*Guideline:* Base file minimal; one dev override or use `profiles:`. Avoid file sprawl.

---

## 14) Resource Limits (CPU / Memory)

**Purpose:** Catch leaks; prevent host starvation; make behavior predictable.

```bash
# Run-time limits
docker run --cpus 1.5 --memory 512m --memory-swap 1g --pids-limit 200 user/app:v1
docker stats [name...]                        # live CPU/Mem/IO metrics

# Compose hint (dev note): deploy.resources is for swarm/orchestrators,
# use run flags locally; or test with small hosts to surface issues.
```

*OOM kills happen when memory cap is exceeded; size data structures and caches accordingly.*

---

## 15) Security Basics (non-root, drop caps, read-only)

**Purpose:** Reduce blast radius; safer defaults.

```bash
# Non-root user
docker run --user 10001:10001 user/app:v1

# Drop all capabilities; add only what you need
docker run --cap-drop ALL --cap-add NET_BIND_SERVICE user/app:v1

# Read-only rootfs + writable tmpfs for temp files
docker run --read-only --tmpfs /tmp:rw,size=64m user/app:v1

# Extra hardening (when compatible)
docker run --security-opt no-new-privileges:true user/app:v1
# Optional: seccomp/apparmor profiles if your org provides them
```

*Check app paths/permissions; some frameworks need `/tmp` or log dirs writable.*

---

# Appendix: Quick Decision Hints

* **Need a shell?** `docker exec -it <name> sh` (existing) or `docker run -it --rm <image> sh` (one-off).
* **Expose to outside?** Use `-p host:ctr`; keep internals unexposed on the network.
* **Persist data?** Volumes for app/DB data; bind mounts for dev source/config.
* **Service-to-service?** Same user network; call by **service name**.
* **Builds slow?** Fix `.dockerignore`, reorder Dockerfile for cache, enable BuildKit.
* **Rollbacks?** Tag with semver + SHA; deploy by digest.
* **Space low?** Prune in this order: containers → images (dangling) → cache → system (careful).

That’s your consolidated, dev-first cheat sheet mapped to the 15 core Docker concepts.

---

# Daily Docker Commands

Quick copy-paste list for your README.

## Docker (single containers)

```bash
docker ps
docker images
docker build -t app:dev .
docker run -d --name app -p 8080:80 app:dev
docker run --rm -it app:dev sh
docker logs -f app
docker exec -it app sh
docker stop app
docker rm app
docker pull repo/app:tag
docker tag app:dev repo/app:tag
docker push repo/app:tag
docker system prune -f
```

## Docker Compose (multi-container)

```bash
docker compose up -d
docker compose up --build -d
docker compose down
docker compose ps
docker compose logs -f <service>
docker compose exec <service> sh
```
