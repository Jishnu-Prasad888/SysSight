# views.py - Fixed version
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from .models import MonitoringAgent, SystemLog, Alert, UserSession, AgentRegistrationRequest, HostMetric, ProcessSnapshot, ResourceThreshold, NotificationChannel
from .serializers import *
from .utils import EncryptionManager, AlertGenerator
import logging
from datetime import datetime, timedelta
import json
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import requests
import threading

logger = logging.getLogger(__name__)

class MonitoringAgentViewSet(viewsets.ModelViewSet):
    queryset = MonitoringAgent.objects.all()
    serializer_class = MonitoringAgentSerializer
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get agent statistics"""
        try:
            total_agents = MonitoringAgent.objects.count()
            active_agents = MonitoringAgent.objects.filter(is_active=True, is_approved=True).count()
            pending_registrations = AgentRegistrationRequest.objects.filter(status='pending').count()
            
            recent_logs_count = SystemLog.objects.filter(
                timestamp__gte=timezone.now() - timedelta(hours=24)
            ).count()
            
            alerts_count = Alert.objects.filter(resolved=False).count()
            
            stats = {
                'total_agents': total_agents,
                'active_agents': active_agents,
                'pending_registrations': pending_registrations,
                'recent_logs_count': recent_logs_count,
                'alerts_count': alerts_count,
            }
            return Response(stats)  # This returns a direct object, not paginated
        except Exception as e:
            return Response({
                'total_agents': 0,
                'active_agents': 0,
                'pending_registrations': 0,
                'recent_logs_count': 0,
                'alerts_count': 0,
                'error': str(e)
            })
    
    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        """Activate an agent"""
        agent = self.get_object()
        agent.is_active = True
        agent.save()
        return Response({'status': 'agent activated'})
    
    @action(detail=True, methods=['post'])
    def deactivate(self, request, pk=None):
        """Deactivate an agent"""
        agent = self.get_object()
        agent.is_active = False
        agent.save()
        return Response({'status': 'agent deactivated'})
    
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve an agent registration"""
        agent = self.get_object()
        agent.is_approved = True
        agent.save()
        return Response({'status': 'agent approved'})
    
    @action(detail=True, methods=['get'])
    def config(self, request, pk=None):
        """Get agent configuration"""
        agent = self.get_object()
        config = {
            'is_active': agent.is_active,
            'is_approved': agent.is_approved,
            'monitoring_scope': agent.monitoring_scope,
            'interval': 60,
            'config_version': agent.config_version,
        }
        return Response(config)
    
    @action(detail=False, methods=['get'])
    def config_by_hostname(self, request):
        """Get agent configuration by hostname"""
        hostname = request.query_params.get('hostname')
        if not hostname:
            return Response({'error': 'hostname parameter required'}, status=400)
        
        try:
            agent = MonitoringAgent.objects.get(hostname=hostname)
            config = {
                'is_active': agent.is_active,
                'is_approved': agent.is_approved,
                'monitoring_scope': agent.monitoring_scope,
                'interval': 60,
                'config_version': agent.config_version,
            }
            return Response(config)
        except MonitoringAgent.DoesNotExist:
            return Response({'error': 'Agent not found'}, status=404)

class AgentRegistrationViewSet(viewsets.ModelViewSet):
    """Handle agent registration requests"""
    queryset = AgentRegistrationRequest.objects.all().order_by('-requested_at')
    serializer_class = AgentRegistrationRequestSerializer
    
    def create(self, request):
        """Handle new agent registration"""
        serializer = RegistrationSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            data = serializer.validated_data
            
            # Check if agent already exists
            if MonitoringAgent.objects.filter(hostname=data['hostname']).exists():
                return Response({
                    'error': 'Agent with this hostname already registered'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Check if pending registration already exists
            if AgentRegistrationRequest.objects.filter(
                hostname=data['hostname'], 
                status='pending'
            ).exists():
                return Response({
                    'error': 'Registration request already pending for this hostname'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Create registration request
            registration = AgentRegistrationRequest.objects.create(
                hostname=data['hostname'],
                username=data['username'],
                ip_address=data['ip_address'],
                encryption_password=data['encryption_password'],
                status='pending'
            )
            
            return Response({
                'status': 'registration_pending',
                'message': 'Registration request submitted for approval',
                'request_id': registration.id
            })
            
        except Exception as e:
            logger.error(f"Registration error: {str(e)}")
            return Response(
                {'error': 'Registration failed', 'details': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve a registration request"""
        registration = self.get_object()
        
        try:
            # Check if agent already exists
            if MonitoringAgent.objects.filter(hostname=registration.hostname).exists():
                return Response({
                    'error': 'Agent with this hostname already exists'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Create the agent
            agent = MonitoringAgent.objects.create(
                hostname=registration.hostname,
                username=registration.username,
                ip_address=registration.ip_address,
                encryption_password=registration.encryption_password,
                is_approved=True,
                is_active=True,
                monitoring_scope='all_users'
            )
            
            # Update registration status
            registration.status = 'approved'
            registration.save()
            
            return Response({
                'status': 'approved',
                'agent_id': agent.id,
                'message': 'Agent approved and created successfully'
            })
            
        except Exception as e:
            logger.error(f"Approval error: {str(e)}")
            return Response(
                {'error': 'Approval failed', 'details': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Reject a registration request"""
        registration = self.get_object()
        registration.status = 'rejected'
        registration.notes = request.data.get('notes', '')
        registration.save()
        
        return Response({'status': 'rejected'})
    
    @action(detail=False, methods=['get'])
    def pending(self, request):
        """Get pending registration requests"""
        pending_requests = AgentRegistrationRequest.objects.filter(status='pending')
        serializer = self.get_serializer(pending_requests, many=True)
        return Response(serializer.data)

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
        """Handle encrypted log uploads from monitoring agents"""
        try:
            data = request.data
            logger.info(f"Received log upload request with keys: {list(data.keys())}")
            # Get required fields
            hostname = data.get('hostname')
            username = data.get('username')
            
            if not hostname:
                return Response({'error': 'hostname is required'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Get agent
            try:
                agent = MonitoringAgent.objects.get(hostname=hostname)
            except MonitoringAgent.DoesNotExist:
                return Response({
                    'error': 'Agent not registered or approved'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Check if agent is allowed to send logs
            if not agent.can_send_logs():
                return Response({
                    'error': 'Agent is not active or approved',
                    'is_active': agent.is_active,
                    'is_approved': agent.is_approved
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Determine if data is encrypted or not
            log_entries = []
            
            if 'encrypted_data' in data:
                # Decrypt the data
                try:
                    encryption_mgr = EncryptionManager(
                        password=agent.get_encryption_password(),
                        salt=agent.encryption_salt
                    )
                    decrypted_data = encryption_mgr.decrypt_data(data['encrypted_data'])
                    print("#"*30)
                    print("DECRYPTED DATA","32")
                    print("DECRYPTED DATA","32")
                    print("DECRYPTED DATA","32")
                    print(decrypted_data)
                    print("#"*30)
                    logger.info("Successfully decrypted data")
                    
                    # Decrypted data should be a list or single dict
                    if isinstance(decrypted_data, list):
                        log_entries = decrypted_data
                    elif isinstance(decrypted_data, dict):
                        log_entries = [decrypted_data]
                    else:
                        raise ValueError(f"Unexpected decrypted data type: {type(decrypted_data)}")
                        
                except Exception as decryption_error:
                    logger.error(f"Decryption failed: {decryption_error}")
                    return Response({
                        'error': 'Decryption failed - check encryption credentials'
                    }, status=status.HTTP_400_BAD_REQUEST)
                    
            elif 'logs' in data:
                # Unencrypted data
                logger.info("Processing unencrypted logs")
                logs_data = data['logs']
                
                if isinstance(logs_data, list):
                    log_entries = logs_data
                elif isinstance(logs_data, dict):
                    log_entries = [logs_data]
                else:
                    return Response({
                        'error': f'Invalid logs format, expected list or dict, got {type(logs_data)}'
                    }, status=status.HTTP_400_BAD_REQUEST)
            else:
                return Response({
                    'error': 'Either encrypted_data or logs field is required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            logger.info(f"Processing {len(log_entries)} log entries")
            
            # Process the logs
            logs_processed = 0
            alerts_generated = 0
            
            for log_entry in log_entries:
                try:
                    # Ensure log_entry is a dict
                    if not isinstance(log_entry, dict):
                        logger.warning(f"Skipping non-dict log entry: {type(log_entry)}")
                        continue
                    
                    # Save system log - handle timezone properly
                    timestamp = log_entry.get('timestamp')
                    if isinstance(timestamp, str):
                        timestamp = timestamp.replace('Z', '+00:00')
                        timestamp = datetime.fromisoformat(timestamp)
                        if timezone.is_naive(timestamp):
                            timestamp = timezone.make_aware(timestamp)
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
                                    if timezone.is_naive(login_time):
                                        login_time = timezone.make_aware(login_time)
                                
                                # Validate host
                                host = user_data.get('host', '0.0.0.0')
                                if host in [':1', '::1']:
                                    host = '127.0.0.1'
                                elif not host or host == ':0.0.0.0' or host.startswith(':'):
                                    host = '0.0.0.0'
                                
                                UserSession.objects.create(
                                    agent=agent,
                                    username=user_data.get('name', 'unknown'),
                                    terminal=user_data.get('terminal', 'unknown'),
                                    host=host,
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
                    logger.error(f"Error processing log entry: {log_error}")
                    import traceback
                    logger.error(f"Traceback: {traceback.format_exc()}")
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
            logger.error(f"Error processing log upload: {str(e)}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            return Response(
                {'error': 'Failed to process logs', 'details': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class AlertViewSet(viewsets.ModelViewSet):
    queryset = Alert.objects.all().order_by('-triggered_at')
    serializer_class = AlertSerializer
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by resolved status
        resolved_param = self.request.query_params.get('resolved')
        if resolved_param == 'true':
            queryset = queryset.filter(resolved=True)
        elif resolved_param == 'false':
            queryset = queryset.filter(resolved=False)
        
        # Filter by level
        level = self.request.query_params.get('level')
        if level:
            queryset = queryset.filter(level=level)
        
        # Filter by agent
        agent_id = self.request.query_params.get('agent')
        if agent_id:
            queryset = queryset.filter(agent_id=agent_id)
        
        return queryset
    
    @action(detail=True, methods=['post'])
    def resolve(self, request, pk=None):
        alert = self.get_object()
        alert.resolved = True
        alert.resolved_at = timezone.now()
        alert.save()
        
        # Send resolution notification
        threading.Thread(target=self._send_resolution_notification, args=(alert,)).start()
        
        return Response({'status': 'alert resolved'})
    
    def _send_resolution_notification(self, alert):
        """Send resolution notifications"""
        channels = NotificationChannel.objects.filter(is_active=True)
        
        for channel in channels:
            try:
                if channel.channel_type == 'email':
                    self._send_email_resolution(channel, alert)
                elif channel.channel_type == 'discord':
                    self._send_discord_resolution(channel, alert)
            except Exception as e:
                logger.error(f"Resolution notification failed for {channel.name}: {str(e)}")
    
    def _send_email_resolution(self, channel, alert):
        """Send email resolution notification"""
        logger.info(f"Would send email resolution for alert: {alert.title}")

    def _send_discord_resolution(self, channel, alert):
        """Send Discord resolution notification"""
        logger.info(f"Would send Discord resolution for alert: {alert.title}")

class UserSessionViewSet(viewsets.ModelViewSet):
    queryset = UserSession.objects.all().order_by('-login_time')
    serializer_class = UserSessionSerializer

class HostMetricViewSet(viewsets.ModelViewSet):
    queryset = HostMetric.objects.all().order_by('-timestamp')
    serializer_class = HostMetricSerializer
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by agent
        agent_id = self.request.query_params.get('agent_id')
        if agent_id and agent_id != 'null':
            try:
                agent_id_int = int(agent_id)
                queryset = queryset.filter(agent_id=agent_id_int)
            except (ValueError, TypeError):
                pass
        
        # Filter by time range
        hours = self.request.query_params.get('hours', 24)
        try:
            time_threshold = timezone.now() - timedelta(hours=int(hours))
            queryset = queryset.filter(timestamp__gte=time_threshold)
        except (ValueError, TypeError):
            time_threshold = timezone.now() - timedelta(hours=24)
            queryset = queryset.filter(timestamp__gte=time_threshold)
        
        return queryset
    
    @action(detail=False, methods=['post'])
    def upload_metrics(self, request):
        """Handle metric uploads from agents"""
        serializer = MetricUploadSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            data = serializer.validated_data
            
            # Get agent
            try:
                agent = MonitoringAgent.objects.get(hostname=data['hostname'])
            except MonitoringAgent.DoesNotExist:
                return Response({'error': 'Agent not found'}, status=status.HTTP_404_NOT_FOUND)
            
            # Save metric
            metric = HostMetric.objects.create(
                agent=agent,
                timestamp=data['timestamp'],
                cpu_usage=data['cpu_usage'],
                memory_usage=data['memory_usage'],
                memory_total=data['memory_total'],
                memory_used=data['memory_used'],
                disk_usage=data['disk_usage'],
                disk_total=data['disk_total'],
                disk_used=data['disk_used'],
                network_sent=data['network_sent'],
                network_received=data['network_received']
            )
            
            return Response({
                'status': 'success',
                'metric_id': metric.id
            })
            
        except Exception as e:
            logger.error(f"Metric upload error: {str(e)}")
            return Response(
                {'error': 'Failed to process metrics'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _check_thresholds(self, agent, metric):
        """Check resource thresholds and generate alerts with cooldown"""
        thresholds = ResourceThreshold.objects.filter(is_active=True)
        
        for threshold in thresholds:
            try:
                should_alert = False
                current_value = 0
                resource_type = ''
                
                if (threshold.resource_type == 'cpu' and 
                    metric.cpu_usage > threshold.threshold_value):
                    should_alert = True
                    current_value = metric.cpu_usage
                    resource_type = 'cpu'
                
                elif (threshold.resource_type == 'memory' and 
                      metric.memory_usage > threshold.threshold_value):
                    should_alert = True
                    current_value = metric.memory_usage
                    resource_type = 'memory'
                
                elif (threshold.resource_type == 'disk' and 
                      metric.disk_usage > threshold.threshold_value):
                    should_alert = True
                    current_value = metric.disk_usage
                    resource_type = 'disk'
                
                if should_alert:
                    if self._should_create_alert(agent, threshold, resource_type):
                        self._create_alert(agent, threshold, current_value, resource_type)
                        
            except Exception as e:
                logger.error(f"Error checking threshold {threshold.name}: {str(e)}")
    
    def _should_create_alert(self, agent, threshold, resource_type):
        """Check if we should create a new alert (cooldown logic)"""
        recent_time = timezone.now() - timedelta(minutes=30)
        
        existing_alerts = Alert.objects.filter(
            agent=agent,
            title=f"Resource threshold exceeded: {threshold.name}",
            resolved=False,
            triggered_at__gte=recent_time
        )
        
        return not existing_alerts.exists()
    
    def _create_alert(self, agent, threshold, current_value, resource_type):
        """Create alert and send notifications"""
        alert_level = 'critical' if current_value > 95 else 'high' if current_value > 85 else 'medium'
        
        alert = Alert.objects.create(
            agent=agent,
            title=f"Resource threshold exceeded: {threshold.name}",
            description=f"{resource_type.upper()} usage {current_value:.1f}% exceeds threshold {threshold.threshold_value}% on {agent.hostname}",
            level=alert_level,
            resolved=False
        )
        
        logger.info(f"Created alert: {alert.title} (Level: {alert.level})")
        
class ProcessViewSet(viewsets.ViewSet):
    @action(detail=False, methods=['post'])
    def upload_processes(self, request):
        """Handle process list upload from agents"""
        serializer = ProcessListSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            data = serializer.validated_data
            # Get agent
            agent = MonitoringAgent.objects.get(hostname=data['hostname'])
            
            # Save process snapshot
            snapshot = ProcessSnapshot.objects.create(
                agent=agent,
                processes=data['processes']
            )
            
            return Response({
                'status': 'success',
                'snapshot_id': snapshot.id
            })
            
        except Exception as e:
            logger.error(f"Process upload error: {str(e)}")
            return Response(
                {'error': 'Failed to process process list'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def get_processes(self, request):
        """Get current processes for an agent"""
        hostname = request.query_params.get('hostname')
        if not hostname:
            return Response({'error': 'hostname parameter required'}, status=400)
        
        try:
            agent = MonitoringAgent.objects.get(hostname=hostname)
            
            latest_snapshot = ProcessSnapshot.objects.filter(agent=agent).order_by('-timestamp').first()
            
            if not latest_snapshot:
                return Response({
                    'hostname': hostname,
                    'timestamp': timezone.now().isoformat(),
                    'total_processes': 0,
                    'page': 1,
                    'page_size': 50,
                    'total_pages': 0,
                    'processes': []
                })
            
            processes = latest_snapshot.processes.get('processes', [])
            
            page = int(request.query_params.get('page', 1))
            page_size = int(request.query_params.get('page_size', 50))
            
            start_idx = (page - 1) * page_size
            end_idx = start_idx + page_size
            paginated_processes = processes[start_idx:end_idx]
            
            return Response({
                'hostname': hostname,
                'timestamp': latest_snapshot.timestamp,
                'total_processes': len(processes),
                'page': page,
                'page_size': page_size,
                'total_pages': (len(processes) + page_size - 1) // page_size,
                'processes': paginated_processes
            })
                
        except MonitoringAgent.DoesNotExist:
            return Response({'error': 'Agent not found'}, status=404)

class ResourceThresholdViewSet(viewsets.ModelViewSet):
    queryset = ResourceThreshold.objects.all()
    serializer_class = ResourceThresholdSerializer

class NotificationChannelViewSet(viewsets.ModelViewSet):
    queryset = NotificationChannel.objects.all()
    serializer_class = NotificationChannelSerializer