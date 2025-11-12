# Docker Essentials Covered: 15 Core Concepts for Everyday Developers

## 1- Images vs Containers & Layers

**Image:** A read-only “recipe” for your app (OS bits + app files + config).
**Container:** A **running instance** of an image—like pressing “Play” on that recipe.
**Layer:** Each step in an image adds a **layer** (think **lasagna or Photoshop layers**). Layers stack to form the final image.

### Mental model

* **Image = blueprint** you can copy infinitely.
* **Container = live process** created from that blueprint.
* **Layers = build steps** cached to avoid redoing work.

### Why this matters

* Images are **immutable**; containers add a small **writable layer** on top for runtime changes.
* If you “install something” inside a running container, it stays **only in that running container**. Start a **new** container from the same image → those changes are **gone** (unless you baked them into the image).

### Jargon

* **Immutable:** Cannot change after it’s built.
* **Writable layer:** Small top layer where runtime changes live.

---

## 2- Dockerfile Basics (FROM / RUN / COPY / CMD / ENTRYPOINT)

A **Dockerfile** is the script that builds an image.

* **FROM** – The **base image** to start from (e.g., a minimal Linux or a language runtime).
  *Analogy:* Choosing a ready-made kitchen before you cook.

* **RUN** – Execute commands **while building** the image (install packages, create folders).
  *Analogy:* Prepping ingredients before the restaurant opens.

* **COPY / ADD** – Put your local files **into** the image.
  *Analogy:* Stocking the pantry.

* **CMD** – The **default command** the container runs at start. Can be overridden.
  *Analogy:* The default dish the chef makes if no special order is given.

* **ENTRYPOINT** – The **main executable**; combined with `CMD` for arguments. Harder to override.
  *Analogy:* The kitchen the chef always starts in; `CMD` is the default recipe used there.

### Guidance

* Keep images small and steps simple; order your steps to **maximize caching** (put rarely-changing steps early).
* Use `ENTRYPOINT` for the main app and `CMD` for default args (you can override args later).

### Jargon

* **Base image:** Starting point for your image.
* **Build cache:** Reuse of previous layer results to speed builds.

---

## 3- `.dockerignore`

**What it is (jargon):** A *filter file* that tells Docker which files/folders to **exclude** from the build context (the stuff sent to the daemon when you run a build).

### Mental model

Think of your build as airport luggage check. `.dockerignore` is the list of items you **don’t** put in the suitcase—so check-in is faster and cheaper.

### Why it matters

* **Speed:** Smaller context = faster upload to the Docker daemon/remote builders.
* **Cache quality:** Avoids random file changes (like logs) that would **invalidate cache**.
* **Security:** Keeps secrets (`.env`, keys) out of images.

### What to usually ignore

* Dependencies and build outputs: `node_modules/`, `dist/`, `build/`, `coverage/`
* VCS & editor junk: `.git/`, `.gitignore`, `.DS_Store`, `.vscode/`
* Logs/temp: `*.log`, `tmp/`
* Local env & secrets: `.env`, `*.pem`, `*.key`

### Pitfalls

* Forgetting `.dockerignore` → huge, slow builds; broken cache on every change.
* Ignoring too aggressively (e.g., ignoring files you later need to `COPY`) → missing files at runtime.

---

## 4- Multi-Stage Builds

**What it is:** A Dockerfile technique where you use **multiple `FROM` stages**. You build (compile/test/package) in one stage, then **copy only the needed artifacts** into a tiny final image.
**Why:** Smaller, safer images; fewer CVEs; faster pulls; clean separation of **build-time** vs **run-time**.

### Mental model

* **Builder kitchen → Serving counter.** Prep with heavy tools in the builder; serve a small plate in the final image.
* Stages have **names** (`AS build`, `AS test`, `AS prod`). Use `COPY --from=<stage>` to move artifacts.

---

### Core pieces (minimal but complete)

* `FROM <base> AS build` – pick a full toolchain (Node/Go/Python…).
* Build stuff: install dev deps, compile, run tests.
* `FROM <base>` – clean runtime base (slim/distroless).
* `COPY --from=build …` – copy only compiled artifacts/configs needed to run.
* Set `ENTRYPOINT`/`CMD` and non-root user.

**Key directives/jargon**

* **Stage alias (`AS`)**: label a stage for later copy.
* **`COPY --from=<stage>`**: copy files from another stage’s filesystem.
* **`scratch`**: empty base; use for static binaries.
* **distroless**: minimal runtime image (no shell/package manager).

---

### Good patterns (by language)

**Node.js (build + lean runtime)**

```dockerfile
# ---- build ----
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- runtime ----
FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
USER 10001:10001
EXPOSE 8080
CMD ["node","dist/server.js"]
```

*Notes:* Keep the **runtime base similar** to the build base to avoid native-module ABI issues. Use `--omit=dev` so dev deps don’t ship.

**Go (static binary)**

```dockerfile
# ---- build ----
FROM golang:1.22 AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o app ./cmd/app

# ---- runtime ----
FROM scratch
WORKDIR /app
COPY --from=build /src/app /app/app
ENTRYPOINT ["/app/app"]
```

*Notes:* With `scratch`, ensure your binary is static and includes certs if needed (or use `distroless/static:nonroot` and copy CA certs).

**Python (build wheels → install in final)**

```dockerfile
# ---- build ----
FROM python:3.12-slim AS build
WORKDIR /app
COPY pyproject.toml poetry.lock* requirements*.txt* ./
RUN pip install --no-cache-dir --upgrade pip && \
    pip wheel --wheel-dir=/wheels -r requirements.txt
COPY . .

# ---- runtime ----
FROM python:3.12-slim
WORKDIR /app
COPY --from=build /wheels /wheels
RUN pip install --no-cache-dir --no-index --find-links=/wheels -r requirements.txt
COPY --from=build /app/src ./src
CMD ["python","-m","src.main"]
```

*Notes:* Build wheels once, install fast in final image; no compiler in runtime.

---

### Guidance

* **Copy the minimum.** Artifacts, not the whole workspace.
* **Keep bases aligned.** Debian→Debian or Alpine→Alpine to avoid native dep issues.
* **Add a test stage.** `FROM build AS test` then `RUN npm test` (not shipped).
* **Set non-root + read-only** in final stage when possible.
* **Use `.dockerignore`.** Smaller context = better caching and smaller images.
* **Pin versions** (packages, OS) for reproducible builds.

---

### Common gotchas

* **ABI mismatch:** Build on Debian, run on Alpine (musl vs glibc) → native modules fail.
* **Forgotten artifacts:** You built assets but didn’t `COPY` them to final (missing migrations/static files).
* **Bloating final image:** Copying source tree or dev deps into runtime.
* **Secrets leakage:** Using `RUN` with tokens/keys → baked into layers. Use BuildKit secrets/SSH mounts during build.
* **Missing CA certs/timezone** in ultra-minimal bases → outbound HTTPS fails; add `ca-certificates`.

---

### Cheat sheet

```dockerfile
FROM node:22-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
CMD ["node","dist/server.js"]
```

```bash
# Build (local)
docker build -t myapp:local .

# Build multi-platform (CI)
docker buildx build --platform linux/amd64,linux/arm64 -t user/myapp:1.0 --push .

# Inspect layers and size
docker history myapp:local
docker image ls user/myapp:1.0
```

**Takeaway:** Multi-stage builds let you **compile/test heavy**, then **ship light**—clean runtime images, fewer vulnerabilities, faster deploys.


---

## 5- Build Cache, BuildKit & “Build” (in detail)

### Jargon (one-liners)

* **Layer:** Saved snapshot of filesystem changes produced by a Dockerfile instruction.
* **Cache hit:** When Docker reuses a previously built layer because inputs are identical.
* **BuildKit:** The modern build engine for Docker; faster, parallel, smarter caching, secrets/SSH support.

### Mental model

Your Dockerfile is a **layered recipe**. If early steps are unchanged, the builder **reuses** those cooked layers instead of re-cooking.

### How cache really works

* Cache keys are based on the **instruction text** + **all inputs** it reads (files, args).
* If step N changes, **N and all steps after it** rebuild; steps before N are reused.
* **Order matters:** Put **stable steps first** (e.g., dependency manifests), then **volatile** steps (your app code).

### Good ordering (typical web app)

1. Copy only dependency manifests (e.g., `package.json`, `poetry.lock`).
2. Install dependencies (cacheable).
3. Copy the rest of the app (changes often).
4. Build the app, then define the runtime command.

### BuildKit perks (even if you never touch flags)

* **Parallelism:** Builds multiple stages/layers concurrently.
* **Inline cache export/import:** Lets CI share cache across runs.
* **Secrets/SSH mounts:** Use credentials **without** baking them into layers.
* **Determinism improvements:** Clearer progress, better cache behavior.

### Common cache killers

* Copying the whole project **before** installing deps → deps layer rebuilds on every code change.
* Not using `.dockerignore` → noisy files change the context hash constantly.
* `RUN` steps that fetch “latest” artifacts without pinning versions → non-reproducible layers.

### Takeaways

* Reorder for cache hits.
* Keep context small.
* Pin versions for reproducible builds.
* Prefer multi-stage builds to produce small, clean runtime images.

---

## 6- Tagging & Versioning Strategy

**Tag:** A human-friendly **label** for an image version (e.g., `1.2.3`, `bookworm`, `alpine`).
**Digest:** A cryptographic **fingerprint** (`@sha256:…`)—**exact bits**, no surprises.

### Good practice

* **Avoid `latest`** in serious work (it drifts).
* **Pin a tag** (e.g., `1.27`) or, for perfect repeatability, a **digest**.
* Use **semantic versioning** if available: `MAJOR.MINOR.PATCH`.

### Analogy

* Tag = nickname (“Spring-release”), Digest = serial number on a device.

---

## 7- Container Lifecycle & Debugging (logs/exec/inspect)

### Jargon

* **Lifecycle states:** *created → running → stopped/exited → removed* (also *paused*).
* **STDOUT/STDERR:** Standard output/error streams—containers should log here.

### Mental model

An image is a **recipe snapshot**, a container is a **running instance** of that snapshot with a tiny writable layer on top.

### Lifecycle essentials

* Start containers from images; stopping removes the running process but **not** the image.
* Containers are **ephemeral**: treat the writable layer as disposable; persist data with **volumes**.

### Debugging trio

* **Logs:** Application output goes to STDOUT/STDERR; Docker collects it.
  *Tip:* Don’t write logs to files inside the container—let Docker (or your platform) ship them.

* **Exec:** “Open a door” into a running container to inspect files/processes.
  *Use case:* peek configs, run a quick curl, check environment.

* **Inspect:** Low-level JSON describing config, mounts, networks, health, labels, image layers.
  *Use case:* verify ports, env, entrypoint, volumes, IPs.

### Pitfalls

* Mutating config inside a running container → lost on restart. Bake changes into the image or mount configs via volumes.
* Assuming logs in `/var/log/...` will be visible by default—redirect/print to STDOUT/STDERR instead.

---

## 8- Healthchecks

**Jargon:** A **periodic test** the engine runs inside a container to decide if it’s *healthy*.

### Mental model

A tiny clinic visit every few seconds. “Can the app respond?” If not, it’s marked **unhealthy**.

### What it does

* Runs a command (e.g., HTTP ping) at intervals.
* Status can be **starting → healthy → unhealthy**.
* Orchestrators/watchdogs can restart or route traffic away from **unhealthy** containers.

### Good healthchecks

* **Fast and lightweight** (milliseconds, not seconds).
* **Directly test** the dependency (e.g., `GET /healthz`).
* **Deterministic exit codes** (0 = OK, non-zero = bad).

### Pitfalls

* Heavy scripts that increase CPU/timeouts.
* Probing a path that doesn’t reflect real readiness (e.g., service depends on DB but healthcheck ignores it).
* Using healthchecks as **readiness** in complex systems—use platform-specific readiness/liveness where available.

---

## 9- Volumes vs Bind Mounts

### What they are

* **Volume**: Docker-managed storage that lives outside a container’s ephemeral layer. Data survives container delete/recreate.
* **Bind mount**: A direct mapping of a **host path** (file/folder) into a container path at run time.

> **Jargon:** Ephemeral layer / UFS (overlayfs) = the writable layer that is deleted with the container.

### Mental model (analogy)

* **Volume** → like a labeled external drive managed by Docker. You plug it into any new container and your data is there.
* **Bind mount** → like opening a shared folder from your laptop inside the container. You and the container see the same files.

### Why they exist

Containers are disposable. Your data isn’t. Volumes and bind mounts keep data beyond a container’s life.

### Key differences

* **Managed by**: Volumes = Docker. Bind mounts = You (host filesystem).
* **Best for**:

  * Volumes → databases, durable app data, portability.
  * Bind mounts → local dev, live-editing code, mounting config files.
* **Performance**: On macOS/Windows (Docker Desktop), volumes are usually faster for DBs than bind mounts (VM boundary).
* **Discoverability**: Volumes are named and inspectable. Bind mounts depend on exact host paths.

### Things to consider

* Use **named volumes** for anything important or shared between container versions.
* For dev loops and static files, **bind mounts** shine (instant updates).
* Don’t mount huge host trees you don’t need. Keep mounts minimal and intentional.
* On Desktop (macOS/Windows), prefer volumes for DBs to avoid slow I/O.

---

## 10- Networking & Port Mapping (bridge/host, DNS)

### What Docker networking gives you

* **Bridge network (default):** A private virtual LAN on the host. Containers talk to each other on this network.
* **Host network:** Container shares the host’s network stack (no isolation, no port mapping).
* **DNS inside Docker:** An internal DNS server lets containers resolve each other by **service/container name** on the same user-defined bridge.

> **Jargon:** NAT = network address translation; Port mapping = exposing a container port on the host.

### Mental model (analogy)

* **Bridge** → a private office LAN behind a router. The router (Docker) forwards select ports to the outside world.
* **Host** → no office walls; your desk is directly on the street. Fast, but zero privacy.

### Port mapping basics

* You map **hostPort → containerPort**. The app still listens on the container port; Docker publishes it on the host.
* Without mapping (on bridge), the app is reachable only from other containers on that network.

### DNS and service discovery

* On a **user-defined bridge**, containers can reach peers by **name** (“api”, “db”). This removes hard-coded IPs.
* Multiple replicas behind a name still resolve correctly; Docker DNS keeps track.

### Things to consider

* Prefer **user-defined bridge networks** for apps that talk to each other (built-in DNS + better isolation).
* Use **host network** only when you truly need raw host networking (and you accept less isolation).
* Keep public surface area small: only map ports you must expose.
* For reverse proxy setups (e.g., Nginx/Caddy), expose only the proxy; keep internal services unexposed on the bridge.

---

## 11- Environment Variables & Secrets

### What they are

* **Environment variables:** Key-value pairs injected into the container’s process. Good for non-sensitive config (feature flags, log levels).
* **Secrets:** Sensitive values (passwords, API keys, tokens) that need protection at rest and in transit.

> **Jargon:** `.env` file = a plaintext file of `KEY=VALUE` used to parameterize configurations.

### Mental model (analogy)

* **Env vars** → sticky notes on the app’s monitor: easy to change per environment.
* **Secrets** → items in a locked drawer: you don’t leave them on sticky notes.

### Good patterns

* Keep configs in env vars; keep **credentials out of images** and out of git.
* Prefer **file-based mounts** or a **secrets manager** for sensitive data (cloud KMS, Vault, AWS Secrets Manager).
* Separate **build-time** settings (baked into the image) from **run-time** env (supplied when starting the container).

### Things to consider

* Avoid committing `.env` with real secrets. Use templates like `.env.example`.
* Treat any env var as potentially exposable via logs/diagnostics. Be mindful what you print.
* Rotate secrets regularly; don’t rely on long-lived tokens.
* Least privilege: credentials should have only the access they need.

---

## 12- Compose v2 Essentials

### What is Compose?

- **Compose (v2):** The official way to define and run multi-container apps.
- **Blueprint:** `compose.yaml` (or `compose.yml`).
- **Remote control:** `docker compose` (note the space; `docker-compose` is legacy).

**Jargon, one-liners**

- **Service:** A container definition (e.g., `web`, `db`).
- **Project:** The whole stack from one Compose file.
- **Named volume:** Docker-managed storage that persists data.
- **Network:** A private bridge where services see each other by name.

### Why use it?

- One command replaces many `docker run` flags.
- Auto-creates the private network and any named volumes.
- Clear, repeatable config you can commit to Git.

### Minimal example (read left → right)

```yaml
# compose.yaml
name: myapp

services:
  web:                         # service name = DNS name inside the project
    image: nginx:alpine        # use an existing image
    ports: ["8080:80"]         # publish only the public entrypoint
    depends_on:                # start order hint
      api:
        condition: service_started

  api:
    build: ./api               # build from local Dockerfile
    environment:               # runtime env vars (safe for non-secrets)
      - PORT=3000
      - DB_HOST=db
      - DB_USER=app
      - DB_PASSWORD=devonly
    # no ports: api is private; web reaches it by name "api:3000"

  db:
    image: postgres:16
    environment:
      - POSTGRES_USER=app
      - POSTGRES_PASSWORD=devonly
      - POSTGRES_DB=appdb
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:               # readiness probe for reliable startup
      test: ["CMD-SHELL","pg_isready -U app -d appdb"]
      interval: 5s
      retries: 10

volumes:
  pgdata:                      # named volume persists DB across restarts

```

### How do services talk?

- Compose creates a **project network**.
- Services resolve each other by **service name** (DNS): e.g., `api` can reach Postgres at `db:5432`.
- You only **publish ports** for things that must be reachable from your laptop or the internet (here: only `web`).

### What happens on `up` and `down`?

- `up`: build (if needed) → create network/volumes → start containers → stream logs (unless `d`).
- `down`: stop containers → remove project network (keeps volumes by default).
- Add `v` to `down` to also remove named volumes (this **deletes data**).

### Things to consider (quick guardrails)

- **Secrets:** Don’t commit real passwords; use `.env` for dev and a secrets manager in prod.
- **Volumes vs bind mounts:** Use **named volumes** for databases; bind-mount code only if you’re actively editing it.
- **Healthchecks:** Prefer them over `sleep` hacks; pair with `depends_on` readiness.
- **Project name:** Set a stable name (`name:` or `p`) so networks/volumes are predictable across machines/CI.

---
## 13- Compose Overrides & Profiles

### What are overrides?

- **Overrides = layered files.** You keep a clean base `compose.yaml`, then add environment-specific changes with extra files (e.g., `compose.dev.yaml`, `compose.prod.yaml`).
- Compose **merges** them in order: later files override earlier ones.

**Analogy:** Think of `compose.yaml` as your default outfit; overrides are jackets you put on for different weather.

### Common pattern

- `compose.yaml` — base (works everywhere).
- `compose.dev.yaml` — dev extras (bind mounts, debuggers, mocks).
- `compose.prod.yaml` — prod tweaks (no bind mounts, stricter restart policies, different images/tags).

**Run with overrides**

```bash
docker compose -f compose.yaml -f compose.dev.yaml up -d
docker compose -f compose.yaml -f compose.prod.yaml up -d

```

**Gotcha (lists):** In overrides, **list fields replace** the original list (e.g., `ports`, `volumes`, `environment`). If you change one item, restate the whole list in the override.

### Example: add dev-only bind mounts without touching base

```yaml
# compose.dev.yaml
services:
  api:
    volumes:
      - ./api:/app:rw           # live-edit code in dev
    environment:
      - NODE_ENV=development

```

### What are profiles?

- **Profiles = opt-in groups of services** you enable when needed.
- You tag services with `profiles: ["dev"]` etc., then start only those profiles.

**Why profiles?** Keep one file, but make certain services optional (e.g., `mailhog`, `kafka`, `adminer`).

**Example**

```yaml
# in compose.yaml (no extra files required)
services:
  web:
    image: nginx:alpine
    ports: ["8080:80"]

  api:
    build: ./api

  mailhog:
    image: mailhog/mailhog
    profiles: ["dev"]          # starts only when profile 'dev' is active

```

**Use it**

```bash
docker compose up -d                  # starts web + api
docker compose --profile dev up -d    # starts web + api + mailhog

```

**Profiles vs overrides**

- **Overrides** change settings for existing services.
- **Profiles** toggle whole services on/off without extra files.
- You can **combine** both: base + dev override **and** `-profile dev`.
---

## 14- Resource Limits (CPU / Memory)

Containers are just processes; they can **hog resources** if you let them.

* **CPU limit:** Cap how much CPU time the container can use.
  *Analogy:* A speed governor on a vehicle.

* **Memory limit:** Cap RAM; if the app exceeds it, it may get **killed (OOM)**.
  *Analogy:* A suitcase size limit—overpack and the zipper breaks.

### Why limit

* Protect your machine from a runaway process.
* Make behavior **predictable** across dev/stage/prod.

### Guidance

* Start with conservative limits; watch runtime usage; adjust slowly.
* Memory spikes often reveal **leaks** or **big in-memory tasks**; CPU spikes suggest **tight loops** or **heavy compute**.

### Jargon

* **OOM (Out-Of-Memory):** The kernel kills the process exceeding allowed memory.
* **Noisy neighbor:** One app disrupting others by hogging resources.

---

## 15- Security Basics (non-root, drop caps, read-only)

### Why care

Containers **share the host kernel**. Reduce what a compromise can do.

> **Jargon:**
> **Root user** = superuser with full permissions.
> **Capabilities (caps)** = fine-grained pieces of root power (e.g., `NET_ADMIN`, `SYS_ADMIN`).
> **Read-only root filesystem** = make the container’s filesystem immutable at run time.

### Core controls

1. **Run as non-root**
   Give the app a regular user inside the container. Limits damage if the app is exploited (can’t freely modify the system or mounted paths it doesn’t own).

2. **Drop unnecessary capabilities**
   Containers inherit a small set of Linux capabilities by default. Remove what you don’t need to shrink the attack surface (e.g., no network admin if you only serve HTTP).

3. **Read-only root filesystem**
   Make the container’s filesystem immutable. App writes should go only to specific writable paths (e.g., a mounted volume for `/data`).

### Mental model (analogy)

* **Non-root** → give your app a “guest badge,” not a master key.
* **Drop caps** → take away the power tools it doesn’t need.
* **Read-only** → lock the cabinets; only a few drawers are writable.

### Things to consider

* Validate the app still runs correctly as non-root (check file ownership and log directories).
* Keep images small (fewer packages = fewer CVEs).
* Avoid mounting the Docker socket into containers (it’s essentially root on the host).
* Don’t run databases with shared writable mounts across multiple containers at once (risk corruption).
* Defense in depth: combine non-root + dropped caps + read-only FS + minimal exposed ports.
* Keep secrets out of env where possible; prefer dedicated secret mounts or managers.

---

# Takeaways:

## 1) Images vs Containers & Layers

* An image is the recipe; a container is the running app.
* Changes made inside a running container do **not** change the image.
* Fewer, well-ordered layers make builds faster and smaller.

## 2) Dockerfile Basics (FROM/RUN/COPY/CMD/ENTRYPOINT)

* Start from a slim, official base image.
* Order steps to reuse cache (copy manifests before app code).
* Use `ENTRYPOINT` for the app binary and `CMD` for default args.

## 3) `.dockerignore`

* Keep `node_modules`, build output, and secrets out of the build context.
* Smaller context = faster, more cache-friendly builds.
* Don’t ignore files you later need to `COPY`.

## 4) Multi-Stage Builds

* Build with tools in one stage and copy only artifacts to the final image.
* The final image should contain only what’s needed to run.
* Use the same OS family for build and run to avoid native module issues.

## 5) Build Cache, BuildKit & Buildx

* BuildKit speeds builds and improves caching by default.
* Put stable steps first; put frequently changing code later.
* Use Buildx for multi-arch images (amd64 + arm64) when needed.

## 6) Tagging & Versioning Strategy

* Never deploy `latest` in real environments.
* Tag images with app version and commit SHA.
* Immutable tags make rollbacks simple and safe.

## 7) Container Lifecycle & Debugging (logs/exec/inspect)

* Send logs to STDOUT/STDERR and watch with `docker logs -f`.
* Use `docker exec -it` to explore a running container.
* `docker inspect` shows networks, env, volumes, and ports.

## 8) Healthchecks

* Probe a lightweight `/health` or `/ready` endpoint.
* Keep checks fast and reliable; avoid heavy scripts.
* Use `depends_on: condition: service_healthy` in Compose to gate startup.

## 9) Volumes vs Bind Mounts

* Use **volumes** for persistent app/DB data.
* Use **bind mounts** for live code during local dev.
* On macOS/Windows, volumes perform better than bind mounts for DBs.

## 10) Networking & Port Mapping (bridge/host, DNS)

* Services on the same network can reach each other by **name**.
* Map only the ports you actually need to expose.
* Inside containers, don’t use `localhost` to reach other services—use their service name.

## 11) Environment Variables & Secrets

* Keep secrets out of images and out of git.
* Provide `.env.example` and load real values only at run time.
* Prefer a secrets manager for production credentials.

## 12) Docker Compose v2 Essentials

* One file declares services, networks, and volumes for your stack.
* Service names become DNS hostnames within the project network.
* `docker compose up -d` starts everything with one command.

## 13) Compose Overrides & Profiles

* Keep a clean base file and use a dev override for local tweaks.
* Profiles let you include optional tools (e.g., mailhog, grafana) only when needed.
* Avoid too many compose files; keep the setup simple.

## 14) Resource Limits (CPU/Memory)

* Set memory/CPU limits to catch leaks and runaway code early.
* Start generous in dev, tighten in staging/prod based on metrics.
* Watch for OOM kills and fix code or adjust limits.

## 15) Security Basics (non-root, drop caps, read-only)

* Run your app as a non-root user inside the container.
* Drop unneeded Linux capabilities to reduce risk.
* Use a read-only root filesystem and write only to known paths.
