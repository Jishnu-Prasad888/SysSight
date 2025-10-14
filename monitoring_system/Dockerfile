FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    postgresql-client \
    gcc \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the entire project
COPY . .

# Create wait_for_db script
RUN echo '#!/bin/bash\n\
until pg_isready -h db -p 5432 -U monitoring_user -d monitoring_db; do\n\
  echo "Waiting for database..."\n\
  sleep 2\n\
done\n\
echo "Database is ready!"' > /usr/local/bin/wait_for_db && chmod +x /usr/local/bin/wait_for_db

# Create management command for waiting
RUN mkdir -p monitoring/management/commands
RUN echo 'import time\n\
from django.db import connections\n\
from django.db.utils import OperationalError\n\
from django.core.management.base import BaseCommand\n\
\n\
class Command(BaseCommand):\n\
    def handle(self, *args, **options):\n\
        self.stdout.write("Waiting for database...")\n\
        db_conn = None\n\
        while not db_conn:\n\
            try:\n\
                db_conn = connections["default"]\n\
                db_conn.cursor()\n\
            except OperationalError:\n\
                self.stdout.write("Database unavailable, waiting 1 second...")\n\
                time.sleep(1)\n\
        self.stdout.write(self.style.SUCCESS("Database available!"))' > monitoring/management/commands/wait_for_db.py

# Create static files directory
RUN mkdir -p staticfiles

# Expose port
EXPOSE 8000

# Default command (can be overridden in docker-compose)
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]