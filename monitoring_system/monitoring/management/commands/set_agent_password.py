from django.core.management.base import BaseCommand
from monitoring.models import MonitoringAgent

class Command(BaseCommand):
    help = 'Set encryption password for a monitoring agent'

    def add_arguments(self, parser):
        parser.add_argument('hostname', type=str, help='Agent hostname')
        parser.add_argument('password', type=str, help='Encryption password')
        parser.add_argument(
            '--salt',
            type=str,
            default='default_salt_12345',
            help='Encryption salt (default: default_salt_12345)'
        )

    def handle(self, *args, **options):
        hostname = options['hostname']
        password = options['password']
        salt = options['salt']
        
        try:
            agent, created = MonitoringAgent.objects.get_or_create(
                hostname=hostname,
                defaults={
                    'username': 'system',
                    'encryption_password': password,
                    'encryption_salt': salt
                }
            )
            
            if not created:
                agent.set_encryption_password(password)
                agent.encryption_salt = salt
                agent.save()
            
            status = 'Created' if created else 'Updated'
            self.stdout.write(
                self.style.SUCCESS(
                    f'✅ {status} agent "{hostname}" with encryption credentials'
                )
            )
            self.stdout.write(f'   Password: {password}')
            self.stdout.write(f'   Salt: {salt}')
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'❌ Error: {str(e)}')
            )