#!/bin/sh

echo "Waiting for Postgres..."
while ! nc -z $POSTGRES_HOST 5432; do
  sleep 1
done
echo "Postgres started"

python manage.py migrate --noinput

# Find an available port (try 8000, 8001, 8002, 8003, 8004)
# If preferred port is unavailable, automatically selects an alternate
AVAILABLE_PORT=$(python find_available_port.py 8000 8001 8002 8003 8004)
if [ $? -ne 0 ]; then
    echo "ERROR: Could not find an available port. Ports 8000-8004 are all in use."
    exit 1
fi

echo "=========================================="
echo "Django development server starting..."
echo "Available port: $AVAILABLE_PORT"
echo "Server will be available at: http://localhost:$AVAILABLE_PORT"
echo "=========================================="

# Run Django development server with auto-reload enabled
# PYTHONUNBUFFERED ensures output is printed immediately
exec python manage.py runserver 0.0.0.0:$AVAILABLE_PORT
