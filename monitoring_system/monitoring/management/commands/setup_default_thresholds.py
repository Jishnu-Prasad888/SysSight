# monitoring/management/commands/setup_default_thresholds.py
from django.core.management.base import BaseCommand
from monitoring.models import ResourceThreshold

class Command(BaseCommand):
    help = 'Setup default resource thresholds'
    
    def handle(self, *args, **options):
        defaults = [
            {
                'name': 'High CPU Usage',
                'resource_type': 'cpu',
                'threshold_value': 85.0,
                'comparison': '>',
                'duration': 300,  # 5 minutes
            },
            {
                'name': 'Critical CPU Usage',
                'resource_type': 'cpu',
                'threshold_value': 95.0,
                'comparison': '>',
                'duration': 60,  # 1 minute
            },
            {
                'name': 'High Memory Usage',
                'resource_type': 'memory',
                'threshold_value': 85.0,
                'comparison': '>',
                'duration': 300,
            },
            {
                'name': 'Critical Memory Usage',
                'resource_type': 'memory',
                'threshold_value': 95.0,
                'comparison': '>',
                'duration': 60,
            },
            {
                'name': 'High Disk Usage',
                'resource_type': 'disk',
                'threshold_value': 90.0,
                'comparison': '>',
                'duration': 600,  # 10 minutes
            },
        ]
        
        created_count = 0
        for default in defaults:
            threshold, created = ResourceThreshold.objects.get_or_create(
                name=default['name'],
                defaults=default
            )
            if created:
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f'Created threshold: {default["name"]}')
                )
        
        self.stdout.write(
            self.style.SUCCESS(f'Successfully created {created_count} default thresholds')
        )