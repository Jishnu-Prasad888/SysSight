import time
import os
from django.db import connections
from django.db.utils import OperationalError
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    """Django command to pause execution until database is available"""

    def handle(self, *args, **options):
        self.stdout.write('Waiting for database...')
        max_retries = 30
        retry_count = 0
        
        db_host = os.environ.get('DATABASE_HOST', 'db')
        db_name = os.environ.get('POSTGRES_DB', 'monitoring_db')
        db_user = os.environ.get('POSTGRES_USER', 'monitoring_user')
        
        self.stdout.write(f'Database config - Host: {db_host}, DB: {db_name}, User: {db_user}')
        
        db_conn = None
        while not db_conn and retry_count < max_retries:
            try:
                db_conn = connections['default']
                db_conn.cursor()
                self.stdout.write(self.style.SUCCESS('Database available!'))
                return
            except OperationalError as e:
                self.stdout.write(
                    self.style.WARNING(f'Database unavailable, waiting 1 second... (Attempt {retry_count + 1}/{max_retries})')
                )
                self.stdout.write(f'Error: {e}')
                retry_count += 1
                time.sleep(2)

        self.stdout.write(
            self.style.ERROR(f'Could not connect to database after {max_retries} attempts')
        )
        exit(1)