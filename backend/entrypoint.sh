#!/bin/sh

echo "Waiting for Postgres..."
while ! nc -z $POSTGRES_HOST 5432; do
  sleep 1
done
echo "Postgres started"

python manage.py migrate --noinput

# Run Django development server with auto-reload enabled
# PYTHONUNBUFFERED ensures output is printed immediately
exec python manage.py runserver 0.0.0.0:8000
