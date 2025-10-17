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
    alert_type_display = serializers.CharField(source='get_alert_type_display', read_only=True)
    
    class Meta:
        model = Alert
        fields = [
            'id', 'agent', 'agent_hostname', 'title', 'description', 
            'level', 'alert_type', 'alert_type_display', 'triggered_at',
            'resolved', 'resolved_at', 'notes', 'metadata'
        ]
        read_only_fields = ['triggered_at', 'resolved_at']

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

class NestedMetricUploadSerializer(serializers.Serializer):
    hostname = serializers.CharField()
    timestamp = serializers.DateTimeField(required=False)
    resource_anomalies = serializers.DictField(child=serializers.FloatField())
    network_connection = serializers.DictField(child=serializers.IntegerField(), required=False)
    
    def create(self, validated_data):
        resource_data = validated_data.get('resource_anomalies', {})
        network_data = validated_data.get('network_connection', {})
        
        return HostMetric.objects.create(
            agent=validated_data['agent'],
            timestamp=validated_data.get('timestamp', timezone.now()),
            cpu_usage=resource_data.get('cpu_percent', 0.0),
            memory_usage=resource_data.get('memory_percent', 0.0),
            disk_usage=resource_data.get('disk_percent', 0.0),
            network_sent=network_data.get('bytes_sent', 0),
            network_received=network_data.get('bytes_recv', 0)
        )

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