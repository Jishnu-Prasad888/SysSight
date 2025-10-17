from django.db import models
from django.contrib.auth.hashers import make_password, check_password
import json
from django.utils import timezone

class MonitoringAgent(models.Model):
    hostname = models.CharField(max_length=255, unique=True)
    username = models.CharField(max_length=255)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    last_seen = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)
    is_approved = models.BooleanField(default=False)
    monitoring_scope = models.CharField(max_length=50, default='all_users')
    
    # Encryption credentials
    encryption_password = models.CharField(max_length=255, null=True, blank=True)
    encryption_salt = models.CharField(max_length=255, default='default_salt_12345')
    
    # Agent configuration
    last_config_update = models.DateTimeField(auto_now=True)
    config_version = models.IntegerField(default=1)
    
    def set_encryption_password(self, password):
        """Store encryption password"""
        self.encryption_password = password
    
    def get_encryption_password(self):
        """Get encryption password"""
        return self.encryption_password
    
    def can_send_logs(self):
        """Check if agent is allowed to send logs"""
        return self.is_active and self.is_approved

    class Meta:
        ordering = ['-created_at']  # Add this line

    def __str__(self):
        return f"{self.hostname} ({'Active' if self.is_active else 'Inactive'})"

class AgentRegistrationRequest(models.Model):
    """Track agent registration requests"""
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]
    
    hostname = models.CharField(max_length=255)
    username = models.CharField(max_length=255)
    ip_address = models.GenericIPAddressField()
    requested_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    encryption_password = models.CharField(max_length=255)
    notes = models.TextField(blank=True)

    def __str__(self):
        return f"Registration: {self.hostname} - {self.status}"

class SystemLog(models.Model):
    agent = models.ForeignKey(MonitoringAgent, on_delete=models.CASCADE, related_name='logs')
    timestamp = models.DateTimeField()
    data = models.JSONField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['agent', 'timestamp']),
            models.Index(fields=['timestamp']),
        ]

    def __str__(self):
        return f"{self.agent.hostname} - {self.timestamp}"

# Add to Alert model in models.py
class Alert(models.Model):
    ALERT_LEVELS = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    ]

    ALERT_TYPES = [
        ('process', 'Process'),
        ('network', 'Network'),
        ('authentication', 'Authentication'),
        ('resource', 'Resource'),
        ('security', 'Security'),
        ('system', 'System'),
    ]

    agent = models.ForeignKey(MonitoringAgent, on_delete=models.CASCADE)
    title = models.CharField(max_length=255)
    description = models.TextField()
    level = models.CharField(max_length=10, choices=ALERT_LEVELS, default='medium')
    alert_type = models.CharField(max_length=20, choices=ALERT_TYPES, default='system')  # New field
    triggered_at = models.DateTimeField(auto_now_add=True)
    resolved = models.BooleanField(default=False)
    resolved_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)  # New field for admin notes
    metadata = models.JSONField(default=dict, blank=True)  # New field for additional data

    class Meta:
        ordering = ['-triggered_at']

    def __str__(self):
        return f"{self.level.upper()}: {self.title}"

    def add_note(self, note):
        """Add a note to the alert"""
        from django.utils import timezone
        timestamp = timezone.now().strftime('%Y-%m-%d %H:%M:%S')
        
        if self.notes:
            self.notes += f"\n[{timestamp}] {note}"
        else:
            self.notes = f"[{timestamp}] {note}"
        self.save()
    ALERT_LEVELS = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    ]

    ALERT_TYPES = [
        ('process', 'Process'),
        ('network', 'Network'),
        ('authentication', 'Authentication'),
        ('resource', 'Resource'),
        ('security', 'Security'),
        ('system', 'System'),
    ]

    agent = models.ForeignKey(MonitoringAgent, on_delete=models.CASCADE)
    title = models.CharField(max_length=255)
    description = models.TextField()
    level = models.CharField(max_length=10, choices=ALERT_LEVELS, default='medium')
    alert_type = models.CharField(max_length=20, choices=ALERT_TYPES, default='system')  # New field
    triggered_at = models.DateTimeField(auto_now_add=True)
    resolved = models.BooleanField(default=False)
    resolved_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)  # New field for admin notes
    metadata = models.JSONField(default=dict)  # New field for additional data like process names, network info

    def __str__(self):
        return f"{self.level.upper()}: {self.title}"

    def add_note(self, note):
        """Add a note to the alert"""
        if self.notes:
            self.notes += f"\n{timezone.now().strftime('%Y-%m-%d %H:%M')}: {note}"
        else:
            self.notes = f"{timezone.now().strftime('%Y-%m-%d %H:%M')}: {note}"
        self.save()

class UserSession(models.Model):
    agent = models.ForeignKey(MonitoringAgent, on_delete=models.CASCADE)
    username = models.CharField(max_length=255)
    terminal = models.CharField(max_length=100)
    host = models.GenericIPAddressField()
    login_time = models.DateTimeField()
    pid = models.IntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['agent', 'username']),
        ]
# models.py - ADD THESE MODELS
class HostMetric(models.Model):
    agent = models.ForeignKey(MonitoringAgent, on_delete=models.CASCADE, related_name='metrics')
    timestamp = models.DateTimeField(default=timezone.now)  # Fixed: use callable
    cpu_usage = models.FloatField(default=0.0)
    memory_usage = models.FloatField(default=0.0)
    memory_total = models.BigIntegerField(default=0)
    memory_used = models.BigIntegerField(default=0)
    disk_usage = models.FloatField(default=0.0)
    disk_total = models.BigIntegerField(default=0)
    disk_used = models.BigIntegerField(default=0)
    network_sent = models.BigIntegerField(default=0)
    network_received = models.BigIntegerField(default=0)
    
    class Meta:
        indexes = [
            models.Index(fields=['agent', 'timestamp']),
            models.Index(fields=['timestamp']),
        ]
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.agent.hostname} - {self.timestamp}"


class ProcessSnapshot(models.Model):
    agent = models.ForeignKey(MonitoringAgent, on_delete=models.CASCADE)
    timestamp = models.DateTimeField(default=timezone.now)  # Fixed: use callable
    processes = models.JSONField(default=dict)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.agent.hostname} - {self.timestamp}"

class ResourceThreshold(models.Model):
    RESOURCE_TYPES = [
        ('cpu', 'CPU'),
        ('memory', 'Memory'),
        ('disk', 'Disk'),
        ('network', 'Network'),
        ('process', 'Process'),
    ]
    
    name = models.CharField(max_length=100, default='New Threshold')
    resource_type = models.CharField(max_length=10, choices=RESOURCE_TYPES, default='cpu')
    threshold_value = models.FloatField(default=80.0)
    comparison = models.CharField(max_length=5, choices=[
        ('>', 'Greater Than'),
        ('<', 'Less Than'),
        ('=', 'Equal To')
    ], default='>')
    process_name = models.CharField(max_length=255, blank=True, null=True)
    duration = models.IntegerField(default=60)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['name']  # Add this line

    def __str__(self):
        return f"{self.name} ({self.resource_type} {self.comparison} {self.threshold_value})"

class NotificationChannel(models.Model):
    CHANNEL_TYPES = [
        ('email', 'Email'),
        ('discord', 'Discord'),
        ('slack', 'Slack'),
        ('webhook', 'Webhook'),
    ]
    
    name = models.CharField(max_length=100, default='New Channel')
    channel_type = models.CharField(max_length=10, choices=CHANNEL_TYPES, default='email')
    config = models.JSONField(default=dict)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['name']  # Add this line

    def __str__(self):
        return f"{self.name} ({self.channel_type})"