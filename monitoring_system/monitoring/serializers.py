from rest_framework import serializers
from .models import MonitoringAgent, SystemLog, Alert, UserSession

class MonitoringAgentSerializer(serializers.ModelSerializer):
    log_count = serializers.IntegerField(read_only=True)
    last_log_time = serializers.DateTimeField(read_only=True)
    
    class Meta:
        model = MonitoringAgent
        fields = '__all__'

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