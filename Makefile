# -----------------------------
# Config
# -----------------------------
COMPOSE = docker compose

# -----------------------------
# Help
# -----------------------------
.PHONY: help
help:
	@echo "Available make targets:"
	@echo "  build        : Build Docker images"
	@echo "  run          : Start application (detached)"
	@echo "  stop         : Stop the application (containers only)"
	@echo "  update       : Pull latest code and rebuild if needed"
	@echo "  status       : Show docker compose processes"
	@echo "  logs         : Show logs for all services"
	@echo "  logs-backend : Show backend logs"
	@echo "  logs-frontend: Show frontend logs"
	@echo "  logs-db      : Show database logs"
	@echo "  logs-web     : Show frontend + backend logs"
	@echo "  reset-db     : Stop app and wipe database (containers + volumes)"
	@echo "  exec-backend : Exec into the backend container shell"
	@echo "  nuke         : Delete containers, images, volumes, networks"
	
# -----------------------------
# 1. Build images (first use)
# -----------------------------
build:
	@echo "Building Docker images..."
	$(COMPOSE) build

# -----------------------------
# 2. Run app in background
# -----------------------------
run:
	@echo "Starting application (detached)..."
	$(COMPOSE) up -d
	@echo "Application started at http://localhost:3000"

# -----------------------------
# 3. Logs
# -----------------------------
logs:
	@echo "Showing logs for all services..."
	$(COMPOSE) logs -f

logs-backend:
	@echo "Backend logs..."
	$(COMPOSE) logs -f backend

logs-frontend:
	@echo "Frontend logs..."
	$(COMPOSE) logs -f frontend

logs-db:
	@echo "Database logs..."
	$(COMPOSE) logs -f db

logs-web:
	@echo "Frontend + Backend logs..."
	$(COMPOSE) logs -f frontend backend

# -----------------------------
# 4. Stop the application
# -----------------------------
stop:
	@echo "Stopping application (containers only)..."
	$(COMPOSE) down

# -----------------------------
# 5. Nuclear option (delete everything)
# -----------------------------
nuke:
	@echo "☢️ NUCLEAR OPTION ☢️"
	@echo "This will delete:"
	@echo "  - Containers"
	@echo "  - Images"
	@echo "  - Volumes (DB DATA)"
	@echo "  - Networks"
	@read -p "Are you ABSOLUTELY sure? [y/N] " ans; \
	if [ "$$ans" = "y" ]; then \
		$(COMPOSE) down -v --rmi all --remove-orphans; \
	else \
		echo "ABORTED."; \
	fi

# -----------------------------
# 6. Stop app and wipe database
# -----------------------------
reset-db:
	@read -p "Are you ABSOLUTELY sure? [y/N] " ans; \
	if [ "$$ans" = "y" ]; then \
		echo "Wiping database (containers + volumes)..."; \
		$(COMPOSE) down -v; \
	else \
		echo "ABORTED."; \
	fi

# -----------------------------
# 7. Update code (git pull + rebuild only)
# -----------------------------
update:
	@echo "Pulling latest code..."
	@git pull

	@echo "Checking for Docker-relevant changes..."
	@CHANGED=$$(git diff --name-only ORIG_HEAD HEAD); \
	if echo "$$CHANGED" | grep -E '(Dockerfile|docker-compose.yml|requirements.txt|package.json)'; then \
		echo "Changes detected → rebuilding images..."; \
		$(COMPOSE) build; \
	else \
		echo "No image-affecting changes detected. Rebuild not required."; \
	fi

# -----------------------------
# Utility
# -----------------------------
status:
	@$(COMPOSE) ps

exec-backend:
	@$(COMPOSE) exec backend sh