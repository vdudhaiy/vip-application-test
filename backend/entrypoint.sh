#!/bin/sh

echo "Waiting for Postgres..."
while ! nc -z $POSTGRES_HOST 5432; do
  sleep 1
done
echo "Postgres started"

python manage.py migrate
python manage.py collectstatic --noinput

gunicorn backend.wsgi:application --bind 0.0.0.0:8000
