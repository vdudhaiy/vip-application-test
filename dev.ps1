<#
.SYNOPSIS
  PowerShell replacement for Makefile commands on Windows.
.DESCRIPTION
  Run with: .\dev.ps1 <command>
  Available commands: build, run, logs, logs-backend, logs-frontend, logs-db, logs-web,
                      down, nuke, reset-db, update, ps, exec-backend, help
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
    Write-Host "  logs           : Follow logs for all services"
    Write-Host "  logs-backend   : Backend logs"
    Write-Host "  logs-frontend  : Frontend logs"
    Write-Host "  logs-db        : Database logs"
    Write-Host "  logs-web       : Frontend + Backend logs"
    Write-Host "  down           : Stop containers"
    Write-Host "  nuke           : Stop + remove containers, images, volumes (DANGEROUS)"
    Write-Host "  reset-db       : Stop containers + remove DB volumes"
    Write-Host "  update         : Pull latest code and rebuild images if needed"
    Write-Host "  ps             : List running containers"
    Write-Host "  exec-backend   : Enter backend container shell"
    Write-Host "  help           : Show this message"
}

switch ($cmd.ToLower()) {

    "build" {
        Write-Host "Building Docker images..."
        & $DOCKER $COMPOSE build
    }

    "run" {
        Write-Host "Starting application (detached)..."
        & $DOCKER $COMPOSE up -d
    }

    "logs" {
        Write-Host "Following logs for all services..."
        & $DOCKER $COMPOSE logs -f
    }

    "logs-backend" { & $DOCKER $COMPOSE logs -f backend }
    "logs-frontend" { & $DOCKER $COMPOSE logs -f frontend }
    "logs-db" { & $DOCKER $COMPOSE logs -f db }
    "logs-web" { & $DOCKER $COMPOSE logs -f frontend backend }

    "down" {
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

    "ps" { & $DOCKER $COMPOSE ps }
    "exec-backend" { & $DOCKER $COMPOSE exec backend sh }

    "help" { Show-Help }

    default {
        Write-Host "`nUnknown command: $cmd`n"
        Show-Help
    }
}
