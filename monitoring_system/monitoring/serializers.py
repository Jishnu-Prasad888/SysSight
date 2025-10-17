from rest_framework import serializers
from .models import MonitoringAgent, SystemLog, Alert, UserSession, AgentRegistrationRequest , HostMetric , ProcessSnapshot , ResourceThreshold , NotificationChannel

class MonitoringAgentSerializer(serializers.ModelSerializer):
    log_count = serializers.IntegerField(read_only=True)
    last_log_time = serializers.DateTimeField(read_only=True)
    can_send_logs = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = MonitoringAgent
        fields = '__all__'
        extra_kwargs = {
            'encryption_password': {'write_only': True},
        }

class AgentRegistrationRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = AgentRegistrationRequest
        fields = '__all__'
        extra_kwargs = {
            'encryption_password': {'write_only': True},
        }

class SystemLogSerializer(serializers.ModelSerializer):
    agent_hostname = serializers.CharField(source='agent.hostname', read_only=True)
    
    class Meta:
        model = SystemLog
        fields = '__all__'

class AlertSerializer(serializers.ModelSerializer):
    agent_hostname = serializers.CharField(source='agent.hostname', read_only=True)
    
    class Meta:
        model = Alert
        fields = '__all__'

class UserSessionSerializer(serializers.ModelSerializer):
    agent_hostname = serializers.CharField(source='agent.hostname', read_only=True)
    
    class Meta:
        model = UserSession
        fields = '__all__'

class LogUploadSerializer(serializers.Serializer):
    hostname = serializers.CharField(max_length=255)
    username = serializers.CharField(max_length=255)
    encrypted_data = serializers.CharField()
    timestamp = serializers.DateTimeField()

class AgentConfigSerializer(serializers.Serializer):
    is_active = serializers.BooleanField()
    monitoring_scope = serializers.CharField(max_length=50)
    interval = serializers.IntegerField(min_value=10)
    config_version = serializers.IntegerField()

class RegistrationSerializer(serializers.Serializer):
    hostname = serializers.CharField(max_length=255)
    username = serializers.CharField(max_length=255)
    ip_address = serializers.IPAddressField()
    encryption_password = serializers.CharField(max_length=255)
    monitoring_scope = serializers.CharField(max_length=50, default='all_users')
    
class HostMetricSerializer(serializers.ModelSerializer):
    agent_hostname = serializers.CharField(source='agent.hostname', read_only=True)
    
    class Meta:
        model = HostMetric
        fields = '__all__'

class ProcessSnapshotSerializer(serializers.ModelSerializer):
    agent_hostname = serializers.CharField(source='agent.hostname', read_only=True)
    
    class Meta:
        model = ProcessSnapshot
        fields = '__all__'

class ResourceThresholdSerializer(serializers.ModelSerializer):
    class Meta:
        model = ResourceThreshold
        fields = '__all__'

class NotificationChannelSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationChannel
        fields = '__all__'

class MetricUploadSerializer(serializers.Serializer):
    hostname = serializers.CharField(max_length=255)
    timestamp = serializers.DateTimeField()
    cpu_usage = serializers.FloatField()
    memory_usage = serializers.FloatField()
    memory_total = serializers.IntegerField()
    memory_used = serializers.IntegerField()
    disk_usage = serializers.FloatField()
    disk_total = serializers.IntegerField()
    disk_used = serializers.IntegerField()
    network_sent = serializers.IntegerField()
    network_received = serializers.IntegerField()

class ProcessListSerializer(serializers.Serializer):
    hostname = serializers.CharField(max_length=255)
    process_system_activity = serializers.ListField(
        child=serializers.DictField()
    )