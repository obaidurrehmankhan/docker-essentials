SHELL := /bin/bash            # Ensure consistent bash behaviour for every rule.
COMPOSE := docker compose     # Single place to switch between compose v1/v2 CLIs.
STACK := docker-15-nextjs-demo # Project name reused in docs/scripts (not invoked here).

.PHONY: up up-dev down logs ps web-sh api-sh db-sh

# Launch the production-style stack described in compose.yml.
up:
	$(COMPOSE) up -d

# Launch the hot-reload developer workflow by merging compose.yml + overrides
# from compose.dev.yml (which mounts source directories and uses dev servers).
up-dev:
	$(COMPOSE) -f compose.yml -f compose.dev.yml --profile dev up -d

# Stop and remove containers/network/anonymous volumes.
down:
	$(COMPOSE) down

# Quick status of all services (names, ports, health).
ps:
	$(COMPOSE) ps

# Follow logs from every container; handy while coding.
logs:
	$(COMPOSE) logs -f

# Shell helpers drop you inside the running containers for debugging.  These
# align with the service names used in compose.yml.
web-sh:
	$(COMPOSE) exec web sh

api-sh:
	$(COMPOSE) exec api sh

db-sh:
	$(COMPOSE) exec db sh
