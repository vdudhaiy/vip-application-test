<#
.SYNOPSIS
  PowerShell replacement for Makefile commands on Windows.
.DESCRIPTION
  Run with: .\dev.ps1 <command>
  Available commands: build, run, logs, logs-backend, logs-frontend, logs-db, logs-web,
                      down, nuke, reset-db, update, ps, exec-backend, migrate, help
#>

param (
    [string]$cmd = "help"
)

$DOCKER = "docker"
$COMPOSE = "compose"

function Show-Help {
    Write-Host "`nUsage: .\dev.ps1 <command>`n"
    Write-Host "Commands:"
    Write-Host "  build          : Build Docker images"
    Write-Host "  run            : Start app in detached mode"
    Write-Host "  stop           : Stop app/containers"
    Write-Host "  update         : Pull latest code and rebuild images if needed"
    Write-Host "  status         : List running containers"
    Write-Host "  migrate        : Create and apply Django migrations (makemigrations + migrate)"
    Write-Host "  help           : Show this message"
    Write-Host "  logs           : Follow logs for all services"
    Write-Host "  logs-backend   : Backend logs"
    Write-Host "  logs-frontend  : Frontend logs"
    Write-Host "  logs-db        : Database logs"
    Write-Host "  logs-web       : Frontend + Backend logs"
    Write-Host "  reset-db       : Stop containers + remove DB volumes"
    Write-Host "  exec-backend   : Enter backend container shell"
    Write-Host "  nuke           : Stop + remove containers, images, volumes (DANGEROUS)"
    Write-Host "  rebuild         : Rebuild and restart containers (equivalent to 'build' + 'stop' + 'run') for development purposes (does NOT remove volumes, so DB data is preserved)"
}

switch ($cmd.ToLower()) {

    "build" {
        Write-Host "Building Docker images..."
        & $DOCKER $COMPOSE build --no-cache
    }

    "run" {
        Write-Host "Starting application (detached)..."
        & $DOCKER $COMPOSE up -d
        Write-Host ""
        Write-Host "Application starting. Port fallback enabled:"
        Write-Host "  Frontend: tries ports 3000-3004"
        Write-Host "  Backend:  tries ports 8000-8004"
        Write-Host ""
        Write-Host "Checking logs to see actual ports assigned..."
        Start-Sleep -Seconds 2
        
        $frontendLog = & $DOCKER $COMPOSE logs frontend 2>&1 | Select-String "Starting Vite on port|Server will be available at"
        $backendLog = & $DOCKER $COMPOSE logs backend 2>&1 | Select-String "Available port|Server will be available at"
        
        if ($frontendLog) { Write-Host "Frontend: $($frontendLog -join ' | ')" }
        if ($backendLog) { Write-Host "Backend:  $($backendLog -join ' | ')" }
        
        Write-Host ""
        Write-Host "Note: If ports don't appear above, wait a moment and run: .\dev.ps1 logs"
        Write-Host "Opening browser to http://localhost:3000 (or check logs for actual port)..."
        Start-Process "http://localhost:3000"
    }

    "logs" {
        Write-Host "Following logs for all services..."
        & $DOCKER $COMPOSE logs -f
    }

    "logs-backend" { & $DOCKER $COMPOSE logs -f backend }
    "logs-frontend" { & $DOCKER $COMPOSE logs -f frontend }
    "logs-db" { & $DOCKER $COMPOSE logs -f db }
    "logs-web" { & $DOCKER $COMPOSE logs -f frontend backend }

    "stop" {
        Write-Host "Stopping containers..."
        & $DOCKER $COMPOSE down
    }

    "nuke" {
        Write-Host "☢️  NUCLEAR OPTION ☢️"
        Write-Host "This will delete:"
        Write-Host "  - Containers"
        Write-Host "  - Images"
        Write-Host "  - Volumes (DB DATA)"
        Write-Host "  - Networks"
        $ans = Read-Host "Are you ABSOLUTELY sure? [y/N]"
        if ($ans -eq "y") {
            & $DOCKER $COMPOSE down -v --rmi all --remove-orphans
        } else {
            Write-Host "ABORTED."
        }
    }

    "reset-db" {
        $ans = Read-Host "Are you ABSOLUTELY sure? [y/N]"
        if ($ans -eq "y") {
            Write-Host "Wiping database (containers + volumes)..."
            & $DOCKER $COMPOSE down -v
        } else {
            Write-Host "ABORTED."
        }
    }

    "update" {
        Write-Host "Pulling latest code..."
        git pull

        Write-Host "Checking for Docker-relevant changes..."
        $changed = git diff --name-only ORIG_HEAD HEAD
        if ($changed -match 'Dockerfile|docker-compose.yml|requirements.txt|package.json') {
            Write-Host "Changes detected → rebuilding images..."
            & $DOCKER $COMPOSE build
        } else {
            Write-Host "No image-affecting changes detected. Rebuild not required."
        }
    }

    "rebuild" {
        Write-Host "Rebuilding and restarting containers..."
        & $DOCKER $COMPOSE build --no-cache
        & $DOCKER $COMPOSE down
        & $DOCKER $COMPOSE up -d
        Write-Host "Running migrations..."
        & $DOCKER $COMPOSE exec -T backend python manage.py makemigrations app
        & $DOCKER $COMPOSE exec -T backend python manage.py migrate
        Write-Host "Application started at http://localhost:3000"
        Write-Host "Opening browser..."
        Start-Process "http://localhost:3000"
    }

    "migrate" {
        Write-Host "Creating migrations for model changes..."
        & $DOCKER $COMPOSE exec -T backend python manage.py makemigrations app
        Write-Host "Applying migrations..."
        & $DOCKER $COMPOSE exec -T backend python manage.py migrate
        Write-Host "Migrations complete!"
    }

    "status" { & $DOCKER $COMPOSE ps }

    "exec-backend" { & $DOCKER $COMPOSE exec backend sh }

    "help" { Show-Help }

    default {
        Write-Host "`nUnknown command: $cmd`n"
        Show-Help
    }
}
