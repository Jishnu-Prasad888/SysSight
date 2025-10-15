from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Count, Avg, Max, Min
from django.db.models.functions import TruncHour
from .models import MonitoringAgent, SystemLog, Alert, UserSession
from .serializers import *
from .utils import AlertGenerator
import logging
from datetime import datetime, timedelta
import json

logger = logging.getLogger(__name__)

class MonitoringAgentViewSet(viewsets.ModelViewSet):
    queryset = MonitoringAgent.objects.all()
    serializer_class = MonitoringAgentSerializer
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get agent statistics"""
        try:
            total_agents = MonitoringAgent.objects.count()
            active_agents = MonitoringAgent.objects.filter(is_active=True).count()
            
            # Recent logs (last 24 hours)
            recent_logs_count = SystemLog.objects.filter(
                timestamp__gte=timezone.now() - timedelta(hours=24)
            ).count()
            
            alerts_count = Alert.objects.filter(resolved=False).count()
            
            stats = {
                'total_agents': total_agents,
                'active_agents': active_agents,
                'recent_logs_count': recent_logs_count,
                'alerts_count': alerts_count,
            }
            return Response(stats)
        except Exception as e:
            return Response({
                'total_agents': 0,
                'active_agents': 0,
                'recent_logs_count': 0,
                'alerts_count': 0,
                'error': str(e)
            })

class SystemLogViewSet(viewsets.ModelViewSet):
    queryset = SystemLog.objects.all().order_by('-timestamp')
    serializer_class = SystemLogSerializer
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by agent if provided
        agent_id = self.request.query_params.get('agent_id')
        if agent_id:
            queryset = queryset.filter(agent_id=agent_id)
        
        # Filter by time range
        hours = self.request.query_params.get('hours', 24)
        time_threshold = timezone.now() - timedelta(hours=int(hours))
        queryset = queryset.filter(timestamp__gte=time_threshold)
        
        return queryset
    
    @action(detail=False, methods=['post'])
    def upload_logs(self, request):
        """Handle log uploads from monitoring agents"""
        serializer = LogUploadSerializer(data=request.data)
        if not serializer.is_valid():
            logger.error(f"Invalid serializer data: {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            data = serializer.validated_data
            logger.info(f"Received log upload from {data['hostname']}")
            
            # Get or create agent
            agent, created = MonitoringAgent.objects.get_or_create(
                hostname=data['hostname'],
                defaults={
                    'username': data['username'],
                    'last_seen': timezone.now(),
                }
            )
            
            if not created:
                agent.last_seen = timezone.now()
                agent.save()
            
            # Parse the JSON data directly (no decryption)
            try:
                decrypted_data = json.loads(data['encrypted_data'])
                logger.info("Successfully parsed JSON data")
            except Exception as json_error:
                logger.error(f"JSON parse failed: {json_error}")
                raise ValueError(f"Could not parse JSON data: {json_error}")
            
            if not decrypted_data:
                raise ValueError("No data to process")
            
            # Process the logs
            logs_processed = 0
            alerts_generated = 0
            
            # Handle both single log and batch logs
            if 'logs' in decrypted_data:
                log_entries = decrypted_data['logs']
            else:
                log_entries = [decrypted_data]
            
            for log_entry in log_entries:
                try:
                    # Save system log
                    timestamp = log_entry.get('timestamp')
                    if isinstance(timestamp, str):
                        # Handle ISO format with or without 'Z'
                        timestamp = timestamp.replace('Z', '+00:00')
                        timestamp = datetime.fromisoformat(timestamp)
                    elif timestamp is None:
                        timestamp = timezone.now()
                    
                    system_log = SystemLog.objects.create(
                        agent=agent,
                        timestamp=timestamp,
                        data=log_entry
                    )
                    logs_processed += 1
                    
                    # Save user sessions
                    users_logged_in = log_entry.get('users_logged_in', {})
                    if isinstance(users_logged_in, dict):
                        for user_data in users_logged_in.get('users', []):
                            try:
                                login_time = user_data.get('started', 0)
                                if isinstance(login_time, (int, float)):
                                    login_time = datetime.fromtimestamp(login_time, tz=timezone.utc)
                                
                                UserSession.objects.create(
                                    agent=agent,
                                    username=user_data.get('name', 'unknown'),
                                    terminal=user_data.get('terminal', 'unknown'),
                                    host=user_data.get('host', '0.0.0.0'),
                                    login_time=login_time,
                                    pid=user_data.get('pid', 0)
                                )
                            except Exception as user_error:
                                logger.warning(f"Error saving user session: {user_error}")
                    
                    # Generate alerts
                    alerts = AlertGenerator.generate_alerts(agent, log_entry)
                    for alert_data in alerts:
                        Alert.objects.create(
                            agent=agent,
                            **alert_data
                        )
                    alerts_generated += len(alerts)
                    
                except Exception as log_error:
                    logger.error(f"Error processing log entry: {log_error}", exc_info=True)
                    continue
            
            logger.info(f"Successfully processed {logs_processed} logs, generated {alerts_generated} alerts")
            
            return Response({
                'status': 'success',
                'agent_id': agent.id,
                'agent_hostname': agent.hostname,
                'logs_processed': logs_processed,
                'alerts_generated': alerts_generated
            })
            
        except Exception as e:
            logger.error(f"Error processing log upload: {str(e)}", exc_info=True)
            return Response(
                {'error': 'Failed to process logs', 'details': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def metrics(self, request):
        """Get metrics for dashboard charts"""
        try:
            hours = int(request.query_params.get('hours', 24))
            time_threshold = timezone.now() - timedelta(hours=hours)
            
            recent_logs_count = SystemLog.objects.filter(
                timestamp__gte=time_threshold
            ).count()
            
            agents_count = MonitoringAgent.objects.filter(is_active=True).count()
            alerts_count = Alert.objects.filter(resolved=False).count()
            
            # Sample data for charts
            sample_cpu_data = [
                {'timestamp': '14:00', 'avg_cpu': 25},
                {'timestamp': '14:05', 'avg_cpu': 30},
                {'timestamp': '14:10', 'avg_cpu': 45},
                {'timestamp': '14:15', 'avg_cpu': 35},
                {'timestamp': '14:20', 'avg_cpu': 28},
            ]
            
            sample_memory_data = [
                {'timestamp': '14:00', 'avg_memory': 60},
                {'timestamp': '14:05', 'avg_memory': 65},
                {'timestamp': '14:10', 'avg_memory': 70},
                {'timestamp': '14:15', 'avg_memory': 68},
                {'timestamp': '14:20', 'avg_memory': 62},
            ]
            
            sample_failed_logins = [
                {'hour': '14:00', 'total_failed': 2},
                {'hour': '15:00', 'total_failed': 5},
                {'hour': '16:00', 'total_failed': 1},
                {'hour': '17:00', 'total_failed': 8},
                {'hour': '18:00', 'total_failed': 3},
            ]
            
            sample_process_counts = [
                {'agent__hostname': 'server-01', 'avg_processes': 245},
                {'agent__hostname': 'server-02', 'avg_processes': 189},
            ]
            
            metrics = {
                'cpu_usage': sample_cpu_data,
                'memory_usage': sample_memory_data,
                'failed_logins': sample_failed_logins,
                'process_counts': sample_process_counts,
                'stats': {
                    'recent_logs_count': recent_logs_count,
                    'active_agents': agents_count,
                    'active_alerts': alerts_count,
                }
            }
            
            return Response(metrics)
            
        except Exception as e:
            safe_metrics = {
                'cpu_usage': [{'timestamp': '14:00', 'avg_cpu': 25}],
                'memory_usage': [{'timestamp': '14:00', 'avg_memory': 60}],
                'failed_logins': [{'hour': '14:00', 'total_failed': 0}],
                'process_counts': [],
                'stats': {
                    'recent_logs_count': 0,
                    'active_agents': 0,
                    'active_alerts': 0,
                },
                'error': str(e)
            }
            return Response(safe_metrics)

class AlertViewSet(viewsets.ModelViewSet):
    queryset = Alert.objects.all().order_by('-triggered_at')
    serializer_class = AlertSerializer
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter unresolved alerts by default
        if self.request.query_params.get('resolved') != 'true':
            queryset = queryset.filter(resolved=False)
        
        return queryset
    
    @action(detail=True, methods=['post'])
    def resolve(self, request, pk=None):
        alert = self.get_object()
        alert.resolved = True
        alert.resolved_at = timezone.now()
        alert.save()
        
        return Response({'status': 'alert resolved'})

class UserSessionViewSet(viewsets.ModelViewSet):
    queryset = UserSession.objects.all().order_by('-login_time')
    serializer_class = UserSessionSerializer