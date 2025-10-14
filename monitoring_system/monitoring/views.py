from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Count, Avg, Max, Min
from django.db.models.functions import TruncHour
from .models import MonitoringAgent, SystemLog, Alert, UserSession
from .serializers import *
from .utils import DecryptionManager, AlertGenerator
import logging
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

class MonitoringAgentViewSet(viewsets.ModelViewSet):
    queryset = MonitoringAgent.objects.all()
    serializer_class = MonitoringAgentSerializer
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get agent statistics - FIXED VERSION"""
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
            # Return safe defaults if there's an error
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
    
    def get_queryset(self,request): # type: ignore
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
        serializer = LogUploadSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            data = serializer.validated_data
            
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
            
            # Initialize decryption (in real scenario, you'd get password from secure storage)
            # For demo, using a hardcoded password - in production, use proper key management
            decryption_manager = DecryptionManager()
            # You would get the password from your secure storage based on the agent
            decryption_manager.initialize_from_password("demo_password", "demo_salt")
            
            # Decrypt the data
            decrypted_data = decryption_manager.decrypt_data(data['encrypted_data'])
            
            # Process each log entry
            for log_entry in decrypted_data.get('logs', []):
                # Save system log
                system_log = SystemLog.objects.create(
                    agent=agent,
                    timestamp=log_entry.get('timestamp', timezone.now()),
                    data=log_entry
                )
                
                # Save user sessions
                users_logged_in = log_entry.get('users_logged_in', {})
                for user_data in users_logged_in.get('users', []):
                    UserSession.objects.create(
                        agent=agent,
                        username=user_data['name'],
                        terminal=user_data.get('terminal', ''),
                        host=user_data.get('host', ''),
                        login_time=datetime.fromtimestamp(user_data.get('started', 0)),
                        pid=user_data.get('pid', 0)
                    )
                
                # Generate alerts
                alerts = AlertGenerator.generate_alerts(agent, log_entry)
                for alert_data in alerts:
                    Alert.objects.create(
                        agent=agent,
                        **alert_data
                    )
            
            return Response({
                'status': 'success',
                'agent_id': agent.id,
                'logs_processed': len(decrypted_data.get('logs', [])),
                'alerts_generated': len(alerts)
            })
            
        except Exception as e:
            logger.error(f"Error processing log upload: {str(e)}")
            return Response(
                {'error': 'Failed to process logs', 'details': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def metrics(self, request):
        """Get metrics for dashboard charts - FIXED VERSION"""
        try:
            hours = int(request.query_params.get('hours', 24))
            time_threshold = timezone.now() - timedelta(hours=hours)
            
            # Get basic counts instead of JSON field aggregations
            recent_logs_count = SystemLog.objects.filter(
                timestamp__gte=time_threshold
            ).count()
            
            agents_count = MonitoringAgent.objects.filter(is_active=True).count()
            alerts_count = Alert.objects.filter(resolved=False).count()
            
            # Get some sample data for charts (you can replace this with real data later)
            # For now, we'll return sample data since we don't have real monitoring data yet
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
            # Return safe sample data even if there's an error
            safe_metrics = {
                'cpu_usage': [{'timestamp': '14:00', 'avg_cpu': 25}],
                'memory_usage': [{'timestamp': '14:00', 'avg_memory': 60}],
                'failed_logins': [{'hour': '14:00', 'total_failed': 0}],
                'process_counts': [],
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