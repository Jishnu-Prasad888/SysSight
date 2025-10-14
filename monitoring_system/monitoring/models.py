from django.db import models
import json

class MonitoringAgent(models.Model):
    hostname = models.CharField(max_length=255, unique=True)
    username = models.CharField(max_length=255)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    last_seen = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)
    monitoring_scope = models.CharField(max_length=50, default='all_users')

    def __str__(self):
        return self.hostname

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

class Alert(models.Model):
    ALERT_LEVELS = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    ]

    agent = models.ForeignKey(MonitoringAgent, on_delete=models.CASCADE)
    title = models.CharField(max_length=255)
    description = models.TextField()
    level = models.CharField(max_length=10, choices=ALERT_LEVELS, default='medium')
    triggered_at = models.DateTimeField(auto_now_add=True)
    resolved = models.BooleanField(default=False)
    resolved_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.level.upper()}: {self.title}"

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